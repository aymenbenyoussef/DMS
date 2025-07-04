# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from db import db
from datetime import timedelta, datetime
from werkzeug.utils import secure_filename
import os
from flask_cors import cross_origin

app = Flask(__name__)
CORS(app)

# ====== Logging Configuration ======
LOG_DIR = "logs"
USER_CREATION_LOG = os.path.join(LOG_DIR, "user_creation.log")

def ensure_log_dir():
    """Create logs directory if it doesn't exist"""
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

def log_user_creation(admin_name, user):
    """Log user creation events"""
    ensure_log_dir()
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    log_entry = f"{timestamp} - {admin_name} - Create new user: {user['user_id']}, {user['username']}, {user['email']}, {'enabled' if user['is_active'] else 'disabled'}\n"
    
    with open(USER_CREATION_LOG, "a") as f:
        f.write(log_entry)

def get_user_creation_logs():
    """Read user creation logs from file"""
    ensure_log_dir()
    if not os.path.exists(USER_CREATION_LOG):
        return []
    
    with open(USER_CREATION_LOG, "r") as f:
        return [line.strip() for line in f.readlines() if line.strip()]

# ====== Existing Configuration ======
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    current_user = get_jwt_identity()
    
    if 'file' not in request.files:
        return jsonify({"msg": "No file part in the request"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # To avoid overwriting files, you might want to make the filename unique
        # For example, prefix with user id + timestamp
        import time
        filename = f"{current_user}_{int(time.time())}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        file.save(file_path)
        
        # Save file info and path to DB
        # Adjust according to your db.py and schema
        try:
            document_id = db.create_document(
                owner_id=current_user['id'],
                company_id=request.form.get('company_id'),  # sent from client
                filename=filename,
                document_type=request.form.get('document_type', 'non_invoice'),
                file_path=file_path  # <-- save the path here!
            )
            return jsonify({"msg": "File uploaded successfully", "document_id": document_id}), 201
        except Exception as e:
            return jsonify({"msg": f"Database error: {str(e)}"}), 500
    else:
        return jsonify({"msg": "File type not allowed"}), 400

#CORS(app, supports_credentials=True)
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=4)
app.config['JWT_SECRET_KEY'] = 'dms-secret-key-2025'  # Change for production
jwt = JWTManager(app)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"msg": "Missing username or password"}), 400

    try:
        user_id = db.create_user(
            username=data['username'],
            password=data['password'],
            role=data.get('role', 'user'),
            is_active=data.get('is_active', True),
            user_limit=data.get('user_limit', 0)
        )
        return jsonify({
            "msg": "User registered successfully",
            "user_id": user_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"msg": "Missing username or password"}), 400

    user = db.get_user_by_username(data['username'])
    if not user or not db.verify_password(user['password_hash'], data['password']):
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user['is_active']:
        return jsonify({"msg": "Account is deactivated"}), 401

    access_token = create_access_token(identity=user['username'], additional_claims={
        "id": user['id'],
        "role": user['role'],
        "username": user['username']
    })
    return jsonify(access_token=access_token), 200

# ====== User Creation Log Endpoint ======
@app.route('/admin/user_creation_logs', methods=['GET'])
@jwt_required()
def get_user_creation_logs():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        print("Unauthorized access attempt to logs")
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        logs = get_user_creation_logs()
        print(f"Returning {len(logs)} log entries")
        return jsonify({"logs": logs}), 200
    except Exception as e:
        print(f"Error fetching logs: {str(e)}")
        return jsonify({"msg": f"Error fetching logs: {str(e)}"}), 500

# Admin routes for user management
@app.route('/admin/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        users = db.get_all_users()
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/admin/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"msg": "Missing username or password"}), 400

    try:
        user_id = db.create_user(
            username=data['username'],
            surname=data['surname'],
            email=data['email'],
            password=data['password'],
            role=data.get('role', 'user'),
            is_active=data.get('is_active', True),
            user_limit=data.get('user_limit', 0),
            companies=data['companies'],
        )
        
        # Log the user creation event
        log_user_creation(
            admin_name=current_user_claims['username'],
            user={
                'user_id': user_id,
                'username': data['username'],
                'email': data.get('email', ''),
                'is_active': data.get('is_active', True)
            }
        )

        return jsonify({
            "msg": "User created successfully",
            "user_id": user_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    try:
        success = db.update_user(
            user_id=user_id,
            username=data.get('username'),
            password=data.get('password') if data.get('password') else None,
            role=data.get('role'),
            is_active=data.get('is_active'),
            user_limit=data.get('user_limit')
        )
        if success:
            return jsonify({"msg": "User updated successfully"}), 200
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        success = db.delete_user(user_id)
        if success:
            return jsonify({"msg": "User deleted successfully"}), 200
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

# Company management routes
@app.route('/companies', methods=['POST'])
@jwt_required()
def create_company():
    # Récupérez les claims complets du JWT au lieu de juste l'identity
    
      # Accédez directement à l'ID depuis les claims
    
    data = request.get_json()

    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Company name is required"}), 400

    try:
        company_id = db.create_company(data)
          
        return jsonify({
            "msg": "Company created successfully",
            "company_id": company_id
        }), 201
    except Exception as e:
        return jsonify({"msg": f"Error creating company: {str(e)}"}), 400

#get all the companies
@app.route('/companies', methods=['GET'])
@jwt_required()
def get_companies():
    try:
        # Récupère les claims du JWT
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")  # 'admin' ou 'user'

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        # Sélection de la méthode selon le rôle
        if user_role == 'admin':
            # Admin : toutes les companies
            companies = db.get_all_companies()
        else:
            # Utilisateur normal : uniquement ses companies
            companies = db.get_user_companies(current_user_id)

        return jsonify(companies), 200

    except Exception as e:
        app.logger.error(f"Error in /companies: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
# Document management routes
@app.route('/documents', methods=['GET'])
@jwt_required()
def get_documents():
    current_user = get_jwt_identity()
    company_id = request.args.get('company_id')
    
    if not company_id:
        return jsonify({"msg": "Company ID is required"}), 400

    try:
        documents = db.get_documents_by_company(company_id)
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/documents', methods=['POST'])
@jwt_required()
def create_document():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get('id')

    # Use form fields instead of JSON
    company_id = request.form.get('company_id')
    document_type = request.form.get('document_type')
    folder_id = request.form.get('folder_id')
    
    if not company_id or not document_type:
        return jsonify({"msg": "Missing company_id or document_type"}), 400

    if document_type not in ['invoice', 'non_invoice']:
        return jsonify({"msg": "Invalid document type"}), 400

    # Check the uploaded file
    if 'file' not in request.files:
        return jsonify({"msg": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"msg": "No selected file"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    file_size = os.path.getsize(file_path)

    try:
        document_id = db.create_document(
            owner_id=current_user_id,
            company_id=company_id,
            filename=filename,
            document_type=document_type,
            folder_id=folder_id,
            file_path=file_path,
            file_size=file_size
        )
        db.add_document_history(document_id, current_user_id, 'Document created')
        
        return jsonify({
            "msg": "Document created successfully",
            "document_id": document_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/documents/<int:document_id>/history', methods=['GET'])
@jwt_required()
def get_document_history(document_id):
    try:
        history = db.get_document_history(document_id)
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

# Folder management routes
@app.route('/folders', methods=['GET'])
@jwt_required()
def get_folders():
    company_id = request.args.get('company_id')
    parent_id = request.args.get('parent_id')
    
    try:
        if company_id:
            folders = db.get_folders_by_company(
                company_id, 
                parent_id=int(parent_id) if parent_id else None
            )
        else:
            folders = db.get_all_folders(parent_id=int(parent_id) if parent_id else None)  # nouvelle méthode à créer dans db.py
        return jsonify(folders), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/folders', methods=['POST'])
@jwt_required()
def create_folder():
    claims = get_jwt()
    current_user_id = claims.get('id')
    data = request.get_json()
    
    required_fields = ['name', 'company_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({"msg": "Missing required fields"}), 400

    try:
        folder_id = db.create_folder(
            name=data['name'],
            created_by=current_user_id,
            company_id=data['company_id'],
            parent_id=data.get('parent_id')
        )
        folder = db.get_folder_by_id(folder_id)
        return jsonify({
            "msg": "Folder created successfully",
            "folder": folder
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/folders/<int:folder_id>', methods=['PUT'])
@jwt_required()
def update_folder(folder_id):
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    try:
        success = db.update_folder(
            folder_id=folder_id,
            name=data.get('name'),
            parent_id=data.get('parent_id')
        )
        if success:
            return jsonify({"msg": "Folder updated successfully"}), 200
        else:
            return jsonify({"msg": "Folder not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/folders/<int:folder_id>', methods=['DELETE'])
@jwt_required()
def delete_folder(folder_id):
    try:
        success = db.delete_folder(folder_id)
        if success:
            return jsonify({"msg": "Folder deleted successfully"}), 200
        else:
            return jsonify({"msg": "Folder not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

if __name__ == '__main__':
    # Ensure log directory exists when app starts
    ensure_log_dir()
    app.run(host='0.0.0.0', debug=True)