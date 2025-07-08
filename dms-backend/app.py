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
from pdf2image import convert_from_bytes
from ocr_utils import process_uploaded_files

app = Flask(__name__)
CORS(app) 

CORS(app, resources={r"/upload": {"origins": "http://localhost:3000"}}, supports_credentials=True)

# ====== Logging Configuration ======
LOG_DIR = "logs"
ACTIVITY_LOG = os.path.join(LOG_DIR, "activity.log")  # Changed to activity.log

def ensure_log_dir():
    """Create logs directory if it doesn't exist"""
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

def log_activity(actor, action, resource_type, resource_data):
    """Log all activities (user/company/document)"""
    ensure_log_dir()
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    # Format log entry based on resource type
    if resource_type == "user":
        log_entry = (
            f"{timestamp} - {actor} - {action} user: "
            f"{resource_data['id']}, {resource_data['username']}, "
            f"{resource_data['email']}, {'enabled' if resource_data['is_active'] else 'disabled'}"
        )
    elif resource_type == "company":
        log_entry = (
            f"{timestamp} - {actor} - {action} company: "
            f"{resource_data['id']}, {resource_data['name']}"
        )
    elif resource_type == "document":
        log_entry = (
            f"{timestamp} - {actor} - {action} document: "
            f"{resource_data['id']}, {resource_data['filename']}, "
            f"company_id={resource_data['company_id']}"
        )
    elif resource_type == "doctype":
        log_entry = (
            f"{timestamp} - {actor} - {action} document type: "
            f"{resource_data['id']}, {resource_data['name']}"
        )
    else:
        return  # Unsupported resource type
    
    with open(ACTIVITY_LOG, "a") as f:
        f.write(log_entry + "\n")

def get_activity_logs():
    """Read activity logs from file"""
    ensure_log_dir()
    if not os.path.exists(ACTIVITY_LOG):
        return []
    
    with open(ACTIVITY_LOG, "r") as f:
        return [line.strip() for line in f.readlines() if line.strip()]

# ====== Existing Configuration ======
UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../uploads'))
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def create_company_upload_folder(company_name):
    """Create a folder for a company in the uploads directory"""
    company_folder = os.path.join(app.config['UPLOAD_FOLDER'], company_name)
    os.makedirs(company_folder, exist_ok=True)
    return company_folder

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
            
            # Log document creation
            current_user_claims = get_jwt()
            log_activity(
                actor=current_user_claims['username'],
                action="Create",
                resource_type="document",
                resource_data={
                    'id': document_id,
                    'filename': filename,
                    'company_id': request.form.get('company_id')
                }
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

def read_activity_logs():
    """Read log file content directly"""
    ensure_log_dir()
    if not os.path.exists(ACTIVITY_LOG):
        return []
    
    try:
        with open(ACTIVITY_LOG, "r") as f:
            return [line.strip() for line in f.readlines() if line.strip()]
    except Exception as e:
        app.logger.error(f"Error reading log file: {str(e)}")
        return []

# Updated endpoint for activity logs
@app.route('/admin/activity_logs', methods=['GET'])
@jwt_required()
def get_activity_logs_endpoint():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        app.logger.warning("Unauthorized access attempt to logs from user: %s", 
                          current_user_claims.get('username'))
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        logs = read_activity_logs()
        app.logger.info("Returning %d log entries to user: %s", 
                       len(logs), current_user_claims.get('username'))
        return jsonify({"logs": logs}), 200
    except Exception as e:
        app.logger.error("Error fetching logs: %s", str(e), exc_info=True)
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
    existing = db.get_user_by_email(data['email'])
    if existing:
        return jsonify({"msg": "A user with this email already exists"}), 400

    try:
        user_id = db.create_user(
            username=data['username'],
            surname=data['surname'],
            email=data['email'],
            password=data['password'],
            is_active=data.get('is_active', True),
            role=data.get('role', 'user'),
            companies=data['companies'],
        )
        
        # Log the user creation event
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
            resource_type="user",
            resource_data={
                'id': user_id,
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
    existing = db.get_user_by_email(data['email'])
    if existing:
        return jsonify({"msg": "A user with this email already exists"}), 400
    try:
        # Get companies list from request data
        companies = data.get('companies', None)
        if companies is not None and not isinstance(companies, list):
            return jsonify({"msg": "Companies must be a list of IDs"}), 400

        success = db.update_user(
            user_id=user_id,
            username=data.get('username'),
            surname=data.get('surname'),
            email=data.get('email'),
            password=data.get('password') if data.get('password') else None,
            is_active=data.get('is_active'),
            companies=companies
        )
        
        if success:
            # Log user update
            log_activity(
                actor=current_user_claims['username'],
                action="Update",
                resource_type="user",
                resource_data={
                    'id': user_id,
                    'username': data.get('username', '[unchanged]'),
                    'email': data.get('email', '[unchanged]'),
                    'is_active': data.get('is_active', '[unchanged]')
                }
            )
            return jsonify({"msg": "User updated successfully"}), 200
        else:
            return jsonify({"msg": "User update failed"}), 400
    except Exception as e:
        return jsonify({"msg": f"Error updating user: {str(e)}"}), 500

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        # Get user info before deletion for logging
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        success = db.delete_user(user_id)
        if success:
            # Log user deletion
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="user",
                resource_data={
                    'id': user_id,
                    'username': user['username'],
                    'email': user['email'],
                    'is_active': False
                }
            )
            return jsonify({"msg": "User deleted successfully"}), 200
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400


# Company management routes
@app.route('/companies', methods=['POST'])
@jwt_required()
def create_company():
    current_user_claims = get_jwt()
    data = request.get_json()

    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Company name is required"}), 400
    
    conflicts = db.check_company_exist(
    data.get('name').strip(),
    data.get('email', '').strip()
    )

    if conflicts["name_exists"] or conflicts["email_exists"]:
        messages = []
        if conflicts["name_exists"]:
            messages.append("Company name already exists.")
        if conflicts["email_exists"]:
            messages.append("Company email already exists.")
        return jsonify({"msg": " ".join(messages)}), 400
    try:
        company_id = db.create_company(data)
        company = db.get_company_by_id(company_id)
        if company:
            create_company_upload_folder(company['name'])
        # Log company creation
        log_activity(
            actor=current_user_claims['username'],
            action="Update",
            resource_type="company",
            resource_data={
                'id': company_id,
                'name': data.get('name')
            }
        )
          
        return jsonify({
            "msg": "Company created successfully",
            "company_id": company_id
        }), 201
    except Exception as e:
        return jsonify({"msg": f"Error creating company: {str(e)}"}), 400
    
    
# Update company
@app.route('/companies/<int:company_id>', methods=['PUT'])
@jwt_required()
def update_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"msg": "Missing company data"}), 400

    try:
        success = db.update_company(
            company_id,
            name=data.get('name'),
            address=data.get('address'),
            email=data.get('email'),
            phone=data.get('phone')
        )
        
        # Get updated company for logging
        company = db.get_company_by_id(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404
            
        # Log company update
        log_activity(
            actor=current_user_claims['username'],
            action="Update",
            resource_type="company",
            resource_data={
                'id': company_id,
                'name': company['name']
            }
        )
        
        return jsonify({"msg": "Company updated successfully"}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

# Delete company (already has logging, just keeping it as reference)
@app.route('/companies/<int:company_id>', methods=['DELETE'])
@jwt_required()
def delete_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        # Get company info before deletion for logging
        company = db.get_company_by_id(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404
        
        success = db.delete_company(company_id)
        if success:
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="company",
                resource_data={
                    'id': company_id,
                    'name': company['name']
                }
            )
            
            return jsonify({"msg": "Company deleted successfully"}), 200
        else:
            return jsonify({"msg": "Company not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

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
    
#get companies by user
@app.route('/companies/<int:user_id>', methods=['get'])
def get_companies_by_user(user_id):
    try:
        companies = db.get_user_companies(user_id)
        return jsonify(companies), 200
    except Exception as e:
        app.logger.error(f"Error in /companies: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/doctype', methods=['POST'])
@jwt_required()
def create_doctype():
    current_user_claims = get_jwt()
    data = request.get_json()

    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Name is required"}), 400

    try:
        # Check if this doctype name already exists
        existing = db.get_doctype_by_name(data['name'].strip())
        if existing:
            return jsonify({"msg": "A document type with this name already exists."}), 400

        # Create the doctype
        doctype_id = db.create_doctype(data)

        # Log creation
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
            resource_type="doctype",
            resource_data={
                'id': doctype_id,
                'name': data['name'].strip()
            }
        )

        return jsonify({
            "msg": "Document type created successfully",
            "doctype_id": doctype_id
        }), 201

    except Exception as e:
        return jsonify({"msg": f"Error creating document type: {str(e)}"}), 400

@app.route('/doctype/<int:doctype_id>/companies', methods=['GET'])
@jwt_required()
def get_doctype_companies(doctype_id):
    try:
        companies = db.get_companies_by_datatype(doctype_id)
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/doctype', methods=['GET'])
@jwt_required()
def get_doctypes():
    try:
        doctypes = db.get_all_doctypes()
        # For each doctype, get associated companies
        result = []
        for doctype in doctypes:
            companies = db.get_companies_by_datatype(doctype['id'])
            doctype['companies'] = companies
            result.append(doctype)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/doctype/<int:doctype_id>', methods=['PUT'])
@jwt_required()
def update_doctype(doctype_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    existing = db.get_doctype_by_name_id(data['name'],doctype_id)
    if existing:
        return jsonify({"msg": "Datatype name already exists"}), 400
    try:
        companies = data.get('companies', None)
        if companies is not None and not isinstance(companies, list):
            return jsonify({"msg": "Companies must be a list of IDs"}), 400
        success = db.update_doctype(
            doctype_id=doctype_id,
            name=data.get('name'),
            status=data.get('status'),
            companies = companies
        )
        
        if success:
            # Log doctype update
            log_activity(
                actor=current_user_claims['username'],
                action="Update",
                resource_type="doctype",
                resource_data={
                    'id': doctype_id,
                    'name': data.get('name', '[unchanged]')
                }
            )
            return jsonify({"msg": "Document type updated successfully"}), 200
        else:
            return jsonify({"msg": "Document type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/doctype/<int:doctype_id>', methods=['DELETE'])
@jwt_required()
def delete_doctype(doctype_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403

    try:
        # Get doctype info before deletion for logging
        doctype = db.get_doctype_by_id(doctype_id)
        if not doctype:
            return jsonify({"msg": "Document type not found"}), 404
        
        success = db.delete_doctype(doctype_id)
        if success:
            # Log doctype deletion
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="doctype",
                resource_data={
                    'id': doctype_id,
                    'name': doctype['name']
                }
            )
            return jsonify({"msg": "Document type deleted successfully"}), 200
        else:
            return jsonify({"msg": "Document type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500
           
@app.route('/folders', methods=['GET'])
@jwt_required()
def get_datatypes():
    company_id = request.args.get('company_id')    
    try:
        if company_id:
            folders = db.get_datatypes_by_company(
                company_id 
                
            )
        
        return jsonify(folders), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500
    
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
        
        # Log document creation
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
            resource_type="document",
            resource_data={
                'id': document_id,
                'filename': filename,
                'company_id': company_id
            }
        )
        
        return jsonify({
            "msg": "Document created successfully",
            "document_id": document_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400


# Updated upload route
@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_files():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get('id')
    
    # Get form data
    company_id = request.form.get('company_id')
    doctype_id = request.form.get('doctype_id')
    
    if not company_id or not doctype_id:
        return jsonify({"msg": "Company and document type required"}), 400
    
    # Get company and doctype info
    company = db.get_company_by_id(company_id)
    doctype = db.get_doctype_by_id(doctype_id)
    
    if not company or not doctype:
        return jsonify({"msg": "Invalid company or document type"}), 400
    
    files = request.files.getlist('files')
    if not files:
        return jsonify({"msg": "No files provided"}), 400
    
    try:
        # Process files with OCR
        results = process_uploaded_files(
            files, 
            app.config['UPLOAD_FOLDER'],
            company['name'], 
            doctype['name']
        )
        
        # Create document records
        for result in results:
            if 'error' in result:
                continue
                
            # Create document record
            document_id = db.create_document(
                owner_id=current_user_id,
                company_id=company_id,
                doctype_id=doctype_id,
                filename=result['filename'],
                file_path=result['file_path'],
                ocr_text=result['ocr_text'],
                invoice_data=json.dumps(result['extracted_data']),
                file_size=os.path.getsize(result['file_path'])
            )
            result['document_id'] = document_id
            
            # Log document creation
            log_activity(
                actor=current_user_claims['username'],
                action="Upload",
                resource_type="document",
                resource_data={
                    'id': document_id,
                    'filename': result['filename'],
                    'company_id': company_id
                }
            )
        
        return jsonify(results), 201
    except Exception as e:
        return jsonify({"msg": f"Processing error: {str(e)}"}), 500

# Confirm document route
@app.route('/documents/<int:document_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_document(document_id):
    current_user_claims = get_jwt()
    data = request.get_json()
    
    # Get document
    document = db.get_document_by_id(document_id)
    if not document:
        return jsonify({"msg": "Document not found"}), 404
    
    try:
        # Create report path
        base_path = os.path.dirname(document['file_path'])
        base_name = os.path.splitext(document['filename'])[0]
        report_path = os.path.join(base_path, f"{base_name}_report.json")
        
        # Save confirmed data
        with open(report_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Update document with confirmed data
        db.update_document(
            document_id,
            invoice_data=json.dumps(data)
        )
        
        # Log confirmation
        log_activity(
            actor=current_user_claims['username'],
            action="Confirm",
            resource_type="document",
            resource_data={
                'id': document_id,
                'filename': document['filename'],
                'company_id': document['company_id']
            }
        )
        
        return jsonify({"msg": "Document confirmed", "report_path": report_path}), 200
    except Exception as e:
        return jsonify({"msg": f"Confirmation error: {str(e)}"}), 500


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