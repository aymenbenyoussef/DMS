from flask import Flask, request, jsonify, send_from_directory, send_file, make_response, abort
from flask_cors import CORS, cross_origin
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
)
from db import db
from datetime import timedelta, datetime
from werkzeug.utils import secure_filename
import os
import shutil
from flask_cors import cross_origin
from pdf2image import convert_from_bytes
from ocr_utils import process_uploaded_files, generate_report_pdf, extract_invoice_data
import json
import pytesseract
from PIL import Image
import glob
from io import BytesIO
from flask import send_file

import logging
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import os
from dotenv import load_dotenv, dotenv_values
load_dotenv()

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

# Configure logging
app.logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
app.logger.addHandler(handler)
# ====== Logging Configuration ======
LOG_DIR = os.environ.get('SYSTEM_LOGS_PATH', '../../logs')
ACTIVITY_LOG = os.path.join(LOG_DIR, "activity.log")






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
            f"{timestamp} - {actor} - {action} User: "
            f"{resource_data['id']}, {resource_data['username']}, "
            f"{resource_data['email']}, {'enabled' if resource_data['is_active'] else 'disabled'}"
        )
    elif resource_type == "company":
        log_entry = (
            f"{timestamp} - {actor} - {action} Entity: "
            f"{resource_data['id']}, {resource_data['name']}"
        )
    elif resource_type == "document":
        log_entry = (
            f"{timestamp} - {actor} - {action} Document: "
            f"{resource_data['id']}, {resource_data['filename']}, "
            f"company_id={resource_data['company_id']}"
        )
    elif resource_type == "doctype":
        log_entry = (
            f"{timestamp} - {actor} - {action} DocType: "
            f"{resource_data['id']}, {resource_data['name']}"
        )
    elif resource_type == "partnertype":
        log_entry = (
            f"{timestamp} - {actor} - {action} PartnerType: "
            f"{resource_data['id']}, {resource_data['name']}, "
            f"{'active' if resource_data.get('status', True) else 'inactive'}"
        )   
    elif resource_type == "partner":
        log_entry = (
            f"{timestamp} - {actor} - {action} Partner: "
            f"{resource_data['id']}, {resource_data['company_name']}, "
            f"type={resource_data.get('partner_type', 'N/A')}, "
            f"status={'active' if resource_data.get('status', True) else 'inactive'}"
        )
    elif resource_type == "login":
        log_entry = (
            f"{timestamp} - {actor} - {action} Compte: "
            f"email={resource_data.get('email','')}, username={resource_data.get('username','')}, "
            f"result={resource_data.get('result','')}, date={resource_data.get('date','')}"
        )
    elif resource_type == "MDPreinitialisation":
        log_entry = (
            f"{timestamp} - {actor} - {action} Compte: "
            f"email={resource_data.get('email','')}, username={resource_data.get('username','')}, "
            f"date={resource_data.get('date','')}"
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

# ====== Upload Configuration ======
_entities_base = os.environ.get('ENTITIES_DATA_PATH', '../../dms-data/upload')
DMS_UPLOAD_FOLDER = os.environ.get('ENTITIES_DATA_PATH', os.path.abspath(os.path.join(os.path.dirname(__file__), _entities_base)))
TEMP_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../uploads'))
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'docx', 'txt', 'doc', 'tiff'}

app.config['DMS_UPLOAD_FOLDER'] = DMS_UPLOAD_FOLDER
app.config['TEMP_UPLOAD_FOLDER'] = TEMP_UPLOAD_FOLDER
os.makedirs(DMS_UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_UPLOAD_FOLDER, exist_ok=True)

def create_company_doctype_folders(company_id, doctype_id):
    """Create folder structure for company and document type automatically using IDs"""
    # Create the main folder structure: /dms/upload/<company_id>/<doctype_id>/
    company_folder = os.path.join(app.config['DMS_UPLOAD_FOLDER'], str(company_id))
    doctype_folder = os.path.join(company_folder, str(doctype_id))
    summary_folder = os.path.join(doctype_folder, 'summary')
    
    # Create all folders
    os.makedirs(company_folder, exist_ok=True)
    os.makedirs(doctype_folder, exist_ok=True)
    os.makedirs(summary_folder, exist_ok=True)
    
    return company_folder, doctype_folder, summary_folder

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_single_file_ocr(file, company_id, doctype_id):
    try:
        # Save the file to temporary folder first (NOT final destination)
        filename = secure_filename(file.filename)
        timestamp = int(datetime.now().timestamp())
        unique_filename = f"{timestamp}_{filename}"
        temp_file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], unique_filename)
        file.save(temp_file_path)

        # Log file path and size
        try:
            file_size = os.path.getsize(temp_file_path)
        except Exception as e:
            file_size = 'unknown'
        print(f"[OCR DEBUG] Processing file: {temp_file_path}, size: {file_size}")

        # Perform OCR based on file type
        text = ""
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
            image = Image.open(temp_file_path).convert("RGB")
            text = pytesseract.image_to_string(image, lang='fra+eng')
        elif filename.lower().endswith('.pdf'):
            with open(temp_file_path, 'rb') as pdf_file:
                images = convert_from_bytes(pdf_file.read(), poppler_path=r'C:\poppler-24.08.0\Library\bin')
                for idx, img in enumerate(images):
                    t = pytesseract.image_to_string(img, lang='fra+eng')
                    text += t + "\n"
        else:
            print(f"[OCR DEBUG] Unsupported file type for OCR: {filename}")
        
        text_filename = f"{os.path.splitext(unique_filename)[0]}.txt"
        text_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], text_filename)
        with open(text_path, 'w', encoding='utf-8') as f:
            f.write(text)

        extracted_data = extract_invoice_data(text)

        return {
            "filename": unique_filename,
            "original_filename": filename,
            "temp_file_path": temp_file_path,
            "text_path": text_path,
            "ocr_text": text,
            "extracted_data": extracted_data
        }

    except Exception as e:
        print(f"[OCR DEBUG] Exception during OCR: {e}")
        return {
            "filename": file.filename,
            "error": str(e)
        }

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
    if not data or "email" not in data or "password" not in data:
        return jsonify({"msg": "Missing email or password"}), 400

    user = db.get_user_by_email(data["email"])
    if not user or not db.verify_password(user["password_hash"], data["password"]):
        return jsonify({"msg": "Identifiants invalides"}), 401

    if not user["is_active"]:
        return jsonify({"msg": "Compte désactivé"}), 401

    # System enabled check (dynamic, from .env)
    config = dotenv_values('.env')
    system_enabled = config.get('SYSTEM_ENABLED', 'true').lower() == 'true'
    if not system_enabled and user["role"] != "superuser":
        return jsonify({"msg": "Le système est inactif"}), 403

    access_token = create_access_token(identity=user["email"], additional_claims={
        "id": user["id"],
        "role": user["role"],
        "username": user["username"],
        "email": user["email"]
    })
    # Log the login event
    log_activity(
        actor=user["username"],
        action="Login",
        resource_type="login",
        resource_data={
            "email": user["email"],
            "username": user["username"],
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    )
    return jsonify(access_token=access_token), 200

# --- Forgot Password Endpoint ---
@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    if not data or "email" not in data:
        return jsonify({"msg": "L'e-mail est requis"}), 400
    email = data["email"]
    user = db.get_user_by_email(email)
    if not user:
        return jsonify({"msg": "Aucun utilisateur trouvé avec cet e-mail."}), 404

    # Generate a secure temporary password
    temp_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))
    db.update_user(user["id"], password=temp_password)
    # Log the password reset event
    log_activity(
        actor=user["username"],
        action="PasswordReset",
        resource_type="MDPreinitialisation",
        resource_data={
            "email": user["email"],
            "username": user["username"],
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    )
    
    # Send email via SMTP
    smtp_host = "smtp.gmail.com"  # Change as needed
    smtp_port = 587
    smtp_user = "ranesmerald358@gmail.com"  # Change to your SMTP email
    smtp_pass = "tvkw cnff wpge eccz"     # Change to your SMTP app password

    subject = "Réinitialisation de votre mot de passe - RAN ESMERALD"
    body = f"""
Cher(e) {user["username"]},

Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte DMS.

Votre mot de passe temporaire est : {temp_password}

Pour des raisons de sécurité, veuillez vous connecter à votre compte dès que possible et modifier ce mot de passe temporaire par un mot de passe de votre choix.

Si vous n'avez pas initié cette demande, veuillez ignorer cet e-mail ou contacter notre support technique immédiatement.

Cordialement,
L'équipe RAN ESMERALD
"""
    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email, msg.as_string())
        server.quit()
    except Exception as e:
        return jsonify({"msg": f"Erreur lors de l'envoi de l'e-mail: {str(e)}"}), 500

    return jsonify({"msg": "Un mot de passe temporaire a été envoyé à votre adresse e-mail."}), 200



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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        app.logger.warning("Unauthorized access attempt to logs from user: %s", 
                          current_user_claims.get('username'))
        return jsonify({"msg": "Admin access required"}), 403
    try:
        logs = read_activity_logs()
        # If admin (not superuser), filter out logs of the superuser
        if current_user_claims.get('role') == 'admin':
            logs = [line for line in logs if 'superuser' not in line and 'slim' not in line]
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    existing = db.get_user_by_email_except_id(data['email'],user_id)
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
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

@app.route('/partnertype', methods=['GET'])
@jwt_required()
def get_partnertypes():
    
    try:
        partners = db.get_all_partner_types()
        return jsonify(partners), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/partnertype', methods=['POST'])
@jwt_required()
def create_partner_type():
    
    current_user_claims = get_jwt()
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({"msg": "Partner type name is required"}), 400
    
    # Vérifier si le nom existe déjà
    if db.check_partner_type_name_exists(data['name'].strip()):
        return jsonify({"msg": "A partner type with this name already exists"}), 400
    try:
        partner_type_id = db.create_partner_type(
            name=data['name'].strip(),
            status=data.get('status', True)
        )
        # Log the creation
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
            resource_type="partnertype",
            resource_data={
                'id': partner_type_id,
                'name': data['name'].strip(),
                'status': data.get('status', True)
            }
        )
        return jsonify({
            "msg": "Partner type created successfully",
            "partner_type_id": partner_type_id
        }), 201
    except Exception as e:
        print("Error in create_partner_type:", str(e))
        return jsonify({"msg": str(e)}), 500

@app.route('/partnertype/<int:partner_type_id>', methods=['PUT'])
@jwt_required()
def update_partner_type(partner_type_id):
    current_user_claims = get_jwt()
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    # Si le nom est fourni, vérifier qu'il n'existe pas déjà (sauf pour ce type de partenaire)
    if 'name' in data and data['name']:
        if db.check_partner_type_name_exists_except_id(data['name'].strip(), partner_type_id):
            return jsonify({"msg": "A partner type with this name already exists"}), 400
    
    try:
        success = db.update_partner_type(
            partner_type_id=partner_type_id,
            name=data.get('name').strip() if data.get('name') else None,
            status=data.get('status')
        )
        
        if success:
            
            log_activity(
                actor=current_user_claims['username'],
                action="Update",
                resource_type="partnertype",
                resource_data={
                    'id': partner_type_id,
                    'name': data.get('name'),
                    'status': data.get('status')
                }
            )
            return jsonify({"msg": "Partner type updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/partnertype/<int:partner_type_id>/status', methods=['PUT'])
@jwt_required()
def update_partner_type_status(partner_type_id):
    current_user_claims = get_jwt()
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({"msg": "Status is required"}), 400
    
    try:
        success = db.update_partner_type_status(partner_type_id, data['status'])
        
        if success:
            return jsonify({"msg": "Partner type status updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/partnertype/<int:partner_type_id>', methods=['DELETE'])
@jwt_required()
def delete_partner_type(partner_type_id):
    current_user_claims = get_jwt()
    
    try:
        # Get partner type info before deletion for logging
        partner_type = db.get_partner_type_by_id(partner_type_id)
        if not partner_type:
            return jsonify({"msg": "Partner type not found"}), 404
        
        success = db.delete_partner_type(partner_type_id)
        if success:
            # Log partner type deletion
            
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="partnertype",
                resource_data={
                    'id': partner_type_id,
                    'name': partner_type['name'],
                    'status': partner_type['status']
                }
            )
            return jsonify({"msg": "Partner type deleted successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500
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
        company_id = db.create_company({
            "name": data.get('name'),
            "address": data.get('address', ''),
            "email": data.get('email', ''),
            "phone": data.get('phone', ''),
            "is_active": data.get('is_active', True),  # Added is_active
            "description": data.get('description', '')  # Added description
        })
        company = db.get_company_by_id(company_id)
        
        # Create company folder in DMS structure using company ID
        if company:
            company_folder = os.path.join(app.config['DMS_UPLOAD_FOLDER'], str(company_id))
            os.makedirs(company_folder, exist_ok=True)
        
        # Log company creation
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        return jsonify({"msg": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"msg": "Missing company data"}), 400
    
    conflicts = db.check_company_exist_id(
    data.get('name').strip(),
    data.get('email', '').strip(),
    company_id
    )

    if conflicts["name_exists"] or conflicts["email_exists"]:
        messages = []
        if conflicts["name_exists"]:
            messages.append("Company name already exists.")
        if conflicts["email_exists"]:
            messages.append("Company email already exists.")
        return jsonify({"msg": " ".join(messages)}), 400
    try:
        success = db.update_company(
            company_id,
            name=data.get('name'),
            address=data.get('address'),
            email=data.get('email'),
            phone=data.get('phone'),
            is_active=data.get('is_active'),  # Added is_active
            description=data.get('description')
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
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        if user_role == "admin" or user_role == "superuser":
            companies = db.get_all_companies()
        else:
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
    



# Partner management routes
# In app.py, modify the create_partner endpoint
@app.route('/partners', methods=['POST'])
@jwt_required()
def create_partner():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    try:
        # Check for existing unique fields
        if db.check_partner_exists(data):
            # Determine which field caused the conflict for a more specific error message
            if db.check_partner_field_exists('company_name', data.get('company_name')):
                return jsonify({"msg": "Un partenaire avec ce nom d'entreprise existe déjà"}), 400
            if db.check_partner_field_exists('unique_identifier', data.get('unique_identifier')):
                return jsonify({"msg": "Un partenaire avec cet identifiant unique existe déjà"}), 400
            if db.check_partner_field_exists('email', data.get('email')):
                return jsonify({"msg": "Un partenaire avec cet e-mail existe déjà"}), 400
            if db.check_partner_field_exists('phone1', data.get('phone1')):
                return jsonify({"msg": "Un partenaire avec ce numéro de téléphone principal existe déjà"}), 400
            if db.check_partner_field_exists('mailing_address', data.get('mailing_address')):
                return jsonify({"msg": "Un partenaire avec cette adresse postale existe déjà"}), 400
            if db.check_partner_field_exists('bank_account_number', data.get('bank_account_number')):
                return jsonify({"msg": "Un partenaire avec ce numéro de compte bancaire existe déjà"}), 400
            # Fallback generic message if no specific conflict is found
            return jsonify({"msg": "Un partenaire avec des champs uniques similaires existe déjà"}), 400
        
        # Convert empty strings to None for optional fields
        for field in ['trade_name', 'billing_address', 'phone2', 'phone3', 
                    'payment_terms', 'billing_terms', 'bank_account_number', 
                    'bank_name', 'notes']:
            if field in data and data[field] == '':
                data[field] = None
        
        partner_id = db.create_partner(data)
        partner = db.get_partner_by_id(partner_id)
        
        # Log partner creation
        log_activity(
            actor=current_user_claims['username'],
            action="Create",
            resource_type="partner",
            resource_data={
                'id': partner_id,
                'company_name': partner['company_name'],
                'partner_type': ', '.join([pt['name'] for pt in partner.get('partnertypes', [])]) if partner.get('partnertypes') else 'N/A',
                'status': partner.get('is_active', True)
            }
        )
        return jsonify({
            "msg": "Partner created successfully",
            "partner_id": partner_id
        }), 201
        
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/partners/<int:partner_id>', methods=['PUT'])
@jwt_required()
def update_partner(partner_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    try:
        # Check if updated values conflict with other partners, excluding the current one
        if db.check_partner_exists(data, exclude_id=partner_id):
            # Determine which field caused the conflict for a more specific error message
            if db.check_partner_field_exists("company_name", data.get("company_name"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec ce nom d\"entreprise existe déjà"}), 400
            if db.check_partner_field_exists("unique_identifier", data.get("unique_identifier"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec cet identifiant unique existe déjà"}), 400
            if db.check_partner_field_exists("email", data.get("email"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec cet e-mail existe déjà"}), 400
            if db.check_partner_field_exists("phone1", data.get("phone1"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec ce numéro de téléphone principal existe déjà"}), 400
            if db.check_partner_field_exists("mailing_address", data.get("mailing_address"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec cette adresse postale existe déjà"}), 400
            if db.check_partner_field_exists("bank_account_number", data.get("bank_account_number"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec ce numéro de compte bancaire existe déjà"}), 400
            # Fallback generic message if no specific conflict is found
            return jsonify({"msg": "Un autre partenaire avec des champs uniques similaires existe déjà"}), 400
        
        # Convert empty strings to None for optional fields
        for field in ["trade_name", "billing_address", "phone2", "phone3", 
                    "payment_terms", "billing_terms", "bank_account_number", 
                    "bank_name", "notes"]:
            if field in data and data[field] == '':
                data[field] = None
        
        success = db.update_partner(partner_id, data)
        
        if success:
            partner = db.get_partner_by_id(partner_id)
            if not partner:
                return jsonify({"msg": "Partner not found"}), 404
            # Log the update
            log_activity(
                actor=current_user_claims["username"],
                action="Update",
                resource_type="partner",
                resource_data={
                    "id": partner_id,
                    "company_name": partner["company_name"],
                    # Get partner types as comma-separated string or 'N/A'
                    "partner_type": ', '.join([pt['name'] for pt in partner.get('partnertypes', [])]) 
                           if partner.get('partnertypes') else 'N/A',
                    "status": partner.get("is_active", True)
                }
            )
            return jsonify({"msg": "Partner updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner not found"}), 404
            
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/partners/<int:partner_id>', methods=['DELETE'])
@jwt_required()
def delete_partner(partner_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        # Get partner info before deletion for logging
        partner = db.get_partner_by_id(partner_id)
        if not partner:
            return jsonify({"msg": "Partner not found"}), 404
        
        success = db.delete_partner(partner_id)
        if success:
            # Log the status change
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="partner",
                resource_data={
                    'id': partner_id,
                    'company_name': partner['company_name'],
                    'partner_type': ', '.join([pt['name'] for pt in partner.get('partnertypes', [])]) if partner.get('partnertypes') else 'N/A',
                    'status': False  # Mark as inactive when deleted
                }
            )
            return jsonify({"msg": "Partner deleted successfully"}), 200
        else:
            return jsonify({"msg": "Partner not found"}), 404
            
    except Exception as e:
        app.logger.error(f"Error deleting partner {partner_id}: {str(e)}")
        return jsonify({"msg": f"Error deleting partner: {str(e)}"}), 500

@app.route('/partners/<int:partner_id>', methods=['GET'])
@jwt_required()
def get_partner(partner_id):
    try:
        partner = db.get_partner_by_id(partner_id)
        if partner:
            return jsonify(partner), 200
        else:
            return jsonify({"msg": "Partner not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400


@app.route("/partners/<int:partner_id>/companies", methods=["GET"])
@jwt_required()
def get_companies_by_partner(partner_id):
    try:
        companies = db.get_companies_by_partner_id(partner_id)
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route("/partners/<int:partner_id>/partnertypes", methods=["GET"])
@jwt_required()
def get_partnertypes_by_partner(partner_id):
    try:
        partnertypes = db.get_partnertypes_by_partner_id(partner_id)
        return jsonify(partnertypes), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route("/partners", methods=["GET"])
@jwt_required()
def get_partners():
    try:
        # Récupère les claims du JWT
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")  # 'admin' ou 'user'

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        # Sélection de la méthode selon le rôle
        if user_role == 'admin' or user_role == 'superuser':
            # Admin or superuser: all partners
            partners = db.get_all_partners()
        else:
            # Utilisateur normal : uniquement les partenaires liés à ses companies
            user_companies = db.get_user_companies(current_user_id)
            if not user_companies:
                return jsonify([]), 200  # Aucune company associée = aucun partenaire
            
            # Récupérer les partenaires pour toutes les companies de l'utilisateur
            all_partners = []
            partner_ids_seen = set()  # Pour éviter les doublons
            
            for company in user_companies:
                company_partners = db.get_partners_by_company(company['id'])
                for partner in company_partners:
                    if partner['id'] not in partner_ids_seen:
                        all_partners.append(partner)
                        partner_ids_seen.add(partner['id'])
            
            partners = all_partners

        # For each partner, get associated companies and partner types
        result = []
        for partner in partners:
            partner_companies = db.get_companies_by_partner_id(partner["id"])
            partner_partnertypes = db.get_partnertypes_by_partner_id(partner["id"])
            partner["companies"] = partner_companies
            partner["partnertypes"] = partner_partnertypes
            result.append(partner)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route("/partners/company/<int:company_id>", methods=["GET"])
@jwt_required()
def get_partners_by_company_route(company_id):
    """Get partners associated with a specific company"""
    try:
        # Récupère les claims du JWT pour vérifier les permissions
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        # Vérifier si l'utilisateur a accès à cette company (sauf pour les admins)
        if user_role != 'admin' and user_role != 'superuser':
            user_companies = db.get_user_companies(current_user_id)
            user_company_ids = [company['id'] for company in user_companies]
            
            if company_id not in user_company_ids:
                return jsonify({"error": "Access denied to this company"}), 403

        # Récupérer les partenaires pour cette company
        partners = db.get_partners_by_company(company_id)
        
        # For each partner, get associated companies and partner types
        result = []
        for partner in partners:
            partner_companies = db.get_companies_by_partner_id(partner["id"])
            partner_partnertypes = db.get_partnertypes_by_partner_id(partner["id"])
            partner["companies"] = partner_companies
            partner["partnertypes"] = partner_partnertypes
            result.append(partner)
            
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400


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
        
        # Create doctype folders for all associated companies
        doctype = db.get_doctype_by_id(doctype_id)
        companies = data.get('companies', [])
        
        for company_id in companies:
            company = db.get_company_by_id(company_id)
            if company:
                create_company_doctype_folders(company['name'], doctype['name'])

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

@app.route('/doctype/company/<int:company_id>', methods=['GET'])
@jwt_required()
def get_doctypes_by_company(company_id):
    try:
        doctypes = db.get_datatypes_by_company(company_id)
        return jsonify(doctypes), 200
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
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
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
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
            folders = db.get_datatypes_by_company(company_id)
            if folders is None:
                folders = []
        else:
            return jsonify({"msg": "company_id is required"}), 400
        return jsonify(folders), 200
    except Exception as e:
        import traceback
        print('Error in /folders:', traceback.format_exc())
        # Always return a list, even on error
        return jsonify([]), 200
    
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
    file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], filename)
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

@app.route('/documents/company/<int:company_id>/type/<int:doctype_id>', methods=['GET'])
@jwt_required()
def get_documents_by_company_and_type(company_id, doctype_id):
    try:
        documents = db.get_documents_by_company_and_type(company_id, doctype_id)
        # Keep rapport field but remove the actual BLOB data to avoid sending large data
        for doc in documents:
            if 'rapport' in doc and doc['rapport'] is not None:
                doc['rapport'] = True  # Just indicate that rapport exists
            if doc.get('extracted_data') and isinstance(doc['extracted_data'], str):
                try:
                    doc['extracted_data'] = json.loads(doc['extracted_data'])
                except Exception as parse_err:
                    print('Error parsing extracted_data:', parse_err, doc.get('extracted_data'))
                    pass
        return jsonify({
            "documents": documents,
            "count": len(documents)
        }), 200
    except Exception as e:
        import traceback
        print('Error in get_documents_by_company_and_type:', e)
        traceback.print_exc()
        return jsonify({"msg": f"Error fetching documents: {str(e)}"}), 500

# ====== NEW SINGLE FILE UPLOAD ENDPOINT ======
@app.route('/upload_single', methods=['POST'])
@jwt_required()
def upload_single_file():
    """Upload and process a single file with OCR"""
    current_user_claims = get_jwt()
    current_user = get_jwt_identity()
    current_user_id = current_user_claims.get('id')
    # Get form data
    company_id = request.form.get('company_id')
    doctype_id = request.form.get('doctype_id')
    
    if not company_id or not doctype_id:
        return jsonify({"msg": "Company ID and document type ID are required"}), 400
    
    # Get uploaded file
    if 'file' not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"msg": "No file selected"}), 400
    
    # Validate file type
    if not allowed_file(file.filename):
        return jsonify({"msg": f"Invalid file type: {file.filename}"}), 400
    
    try:
        # Process the single file with OCR
        processed_file = process_single_file_ocr(file, company_id, doctype_id)
        
        if 'error' in processed_file:
            return jsonify({"msg": f"Processing error: {processed_file['error']}"}), 500
        
        # Save processing results to temporary storage for confirmation
        session_id = f"{current_user_id}_{int(datetime.now().timestamp())}"
        temp_data = {
            'session_id': session_id,
            'company_id': company_id,
            'doctype_id': doctype_id,
            'processed_file': processed_file,
            'user_id': current_user_id
        }
        
        # Store in temporary file
        temp_file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], f"temp_{session_id}.json")
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            json.dump(temp_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "msg": "File processed successfully and stored temporarily. Awaiting confirmation.",
            "session_id": session_id,
            "extracted_data": processed_file['extracted_data']
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Processing error: {str(e)}"}), 500

# ====== ENHANCED MULTIPLE FILES UPLOAD ENDPOINT ======
@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_files():
    """Upload multiple files and process them with OCR"""
    current_user = get_jwt_identity()
    
    # Get form data
    company_id = request.form.get('company_id')
    doctype_id = request.form.get('doctype_id')
    
    if not company_id or not doctype_id:
        return jsonify({"msg": "Company ID and document type ID are required"}), 400
    
    # Get uploaded files
    files = request.files.getlist('files')
    if not files or all(file.filename == '' for file in files):
        return jsonify({"msg": "No files selected"}), 400
    
    # Validate file types
    invalid_files = [file.filename for file in files if file.filename != '' and not allowed_file(file.filename)]
    if invalid_files:
        return jsonify({"msg": f"Invalid file types: {', '.join(invalid_files)}"}), 400
    
    try:
        # Create folder structure
        company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_id, doctype_id)
        
        # Process files with OCR
        processed_files = process_uploaded_files(files, app.config['TEMP_UPLOAD_FOLDER'], company_id, doctype_id)
        
        # Save processing results to temporary storage for confirmation
        session_id = f"{current_user['id']}_{int(datetime.now().timestamp())}"
        temp_data = {
            'session_id': session_id,
            'company_id': company_id,
            'doctype_id': doctype_id,
            'processed_files': processed_files,
            'user_id': current_user['id']
        }
        
        # Store in temporary file (in production, use Redis or database)
        temp_file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], f"temp_{session_id}.json")
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            json.dump(temp_data, f, ensure_ascii=False, indent=2)
        
        # Prepare response data for frontend forms
        forms_data = []
        for processed_file in processed_files:
            if 'error' not in processed_file:
                form_data = {
                    'filename': processed_file['filename'],
                    'company_id': company_id,
                    'doctype_id': doctype_id,
                    'extracted_data': processed_file['extracted_data']
                }
                forms_data.append(form_data)
        
        return jsonify({
            "msg": "Files processed successfully",
            "session_id": session_id,
            "forms_data": forms_data
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Processing error: {str(e)}"}), 500

@app.route('/confirm_document', methods=['POST'])
@jwt_required()
def confirm_document():
    """Confirm and save document information after user validation"""
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get('id')
    data = request.get_json()
    
    session_id = data.get('session_id')
    confirmed_documents = data.get('documents', [])
    
    if not session_id or not confirmed_documents:
        return jsonify({"msg": "Session ID and documents data are required"}), 400
    
    try:
        # Load temporary data
        temp_file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], f"temp_{session_id}.json")
        if not os.path.exists(temp_file_path):
            return jsonify({"msg": "Session expired or invalid"}), 400
        
        with open(temp_file_path, 'r', encoding='utf-8') as f:
            temp_data = json.load(f)
        
        saved_documents = []
        
        for doc_data in confirmed_documents:
            filename = doc_data['filename']
            company_id = doc_data.get('company_id') or temp_data.get('company_id')
            doctype_id = doc_data.get('doctype_id') or temp_data.get('doctype_id')
            is_invoice = doc_data.get("is_invoice", False)
            confirmed_info = doc_data.get("confirmed_data", {})
            partner_id = doc_data.get("partner_id")  # Get partner_id from form data
            
            if not company_id or not doctype_id:
                saved_documents.append({
                    'filename': filename,
                    'error': 'Company ID and Document Type ID are required'
                })
                continue
            
            try:
                # Create folder structure
                company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_id, doctype_id)
                
                # Get the original processed file data
                original_processed_file = None
                if 'processed_file' in temp_data:
                    original_processed_file = temp_data['processed_file']
                elif 'processed_files' in temp_data:
                    for pf in temp_data['processed_files']:
                        if pf['filename'] == filename:
                            original_processed_file = pf
                            break

                if not original_processed_file:
                    saved_documents.append({
                        'filename': filename,
                        'error': 'Original file data not found'
                    })
                    continue

                temp_file_path = original_processed_file.get('temp_file_path')
                if not temp_file_path or not os.path.exists(temp_file_path):
                    saved_documents.append({
                        'filename': filename,
                        'error': 'Temporary file not found'
                    })
                    continue

                # Move file to final location
                final_filename = original_processed_file.get('original_filename', filename)
                timestamp = int(datetime.now().timestamp())
                unique_final_filename = f"{timestamp}_{final_filename}"
                final_file_path = os.path.join(doctype_folder, unique_final_filename)
                shutil.move(temp_file_path, final_file_path)

                # Move OCR text file if exists
                temp_text_path = original_processed_file.get('text_path')
                final_text_path = None
                if temp_text_path and os.path.exists(temp_text_path):
                    final_text_filename = f"{os.path.splitext(unique_final_filename)[0]}.txt"
                    final_text_path = os.path.join(doctype_folder, final_text_filename)
                    shutil.move(temp_text_path, final_text_path)

                file_size = os.path.getsize(final_file_path) if os.path.exists(final_file_path) else 0

                # Add partner_id to confirmed_info if provided
                if partner_id:
                    confirmed_info['partner_id'] = partner_id

                # Prepare fields for insertion
                ocr_text = final_text_path if final_text_path and os.path.exists(final_text_path) else None
                extracted_text = ''
                if ocr_text and os.path.exists(ocr_text):
                    try:
                        with open(ocr_text, 'r', encoding='utf-8') as f:
                            extracted_text = f.read()
                    except Exception as e:
                        extracted_text = ''
                rapport = None
                print(extracted_text)
                if is_invoice and confirmed_info:
                    # Generate report PDF for invoices
                    report_filename = f"{os.path.splitext(unique_final_filename)[0]}_report.pdf"
                    report_path = os.path.join(summary_folder, report_filename)
                    generate_report_pdf(confirmed_info, report_path, unique_final_filename)
                    rapport = report_path
                # For non-invoice documents, ocr_text and rapport remain None
                document_id = db.create_document_with_ocr_data(
                    owner_id=current_user_id,
                    company_id=company_id,
                    doctype_id=doctype_id,
                    filename=unique_final_filename,
                    file_path=final_file_path,
                    file_size=file_size,
                    is_invoice=is_invoice,
                    extracted_data=confirmed_info,
                    extracted_text=extracted_text,
                    partner_id=partner_id,
                    rapport=rapport,
                    ocr_text=ocr_text
                )
                
                if not document_id:
                    raise Exception("Failed to create document in database")
                
                
                
                company = db.get_company_by_id(company_id)
                doctype = db.get_doctype_by_id(doctype_id)
                
                with open(json_path, 'w', encoding='utf-8') as json_file:
                    json.dump({
                        'filename': unique_final_filename,
                        'original_filename': final_filename,
                        'processing_date': datetime.now().isoformat(),
                        'company': {
                            'id': company_id,
                            'name': company.get('name') if company else 'Unknown'
                        },
                        'document_type': {
                            'id': doctype_id,
                            'name': doctype.get('name') if doctype else 'Unknown'
                        },
                        'is_invoice': is_invoice,
                        'partner_id': partner_id,
                        'confirmed_data': confirmed_info,
                        'file_info': {
                            'path': final_file_path,
                            'size': file_size
                        }
                    }, json_file, ensure_ascii=False, indent=2)
                
                # Log document creation
                log_activity(
                    actor=f"{current_user_claims.get('username', 'Unknown')} (id={current_user_id})",
                    action="Create",
                    resource_type="document",
                    resource_data={
                        'id': document_id,
                        'filename': unique_final_filename,
                        'company_id': company_id,
                        'doctype_id': doctype_id,
                        'is_invoice': is_invoice,
                        'partner_id': partner_id,
                        'invoice_number': confirmed_info.get('invoice_number') if is_invoice else None
                    }
                )
                
                saved_documents.append({
                    'document_id': document_id,
                    'filename': unique_final_filename,
                    'original_filename': final_filename,
                    'is_invoice': is_invoice,
                    'partner_id': partner_id,
                    'final_path': final_file_path
                })
                
            except Exception as e:
                saved_documents.append({
                    'filename': filename,
                    'error': str(e)
                })
        
        # Clean up temporary session file
        try:
            os.remove(temp_file_path)
        except:
            pass
        
        return jsonify({
            "msg": "Documents confirmed and saved successfully",
            "saved_documents": saved_documents
        }), 200
        
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

@app.route('/documents/company/<int:company_id>/filtered', methods=['GET'])
@jwt_required()
def get_documents_by_company_filtered(company_id):
    """Get documents for a company with optional filters"""
    try:
        # Get query parameters
        doctype_id = request.args.get('doctype_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Validate date format if provided
        if start_date:
            try:
                datetime.strptime(start_date, '%Y-%m-%d')
            except ValueError:
                return jsonify({"msg": "Invalid start_date format. Use YYYY-MM-DD"}), 400
        
        if end_date:
            try:
                datetime.strptime(end_date, '%Y-%m-%d')
            except ValueError:
                return jsonify({"msg": "Invalid end_date format. Use YYYY-MM-DD"}), 400
        
        # Get documents with filters
        documents = db.get_documents_by_company_with_filters(
            company_id=company_id,
            doctype_id=doctype_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Process documents to add file paths and metadata
        processed_documents = []
        for doc in documents:
            # Add file path for viewing/downloading
            if doc.get('file_path') and os.path.exists(doc['file_path']):
                doc['path'] = doc['file_path']
                doc['size'] = os.path.getsize(doc['file_path'])
                
                # Determine MIME type
                filename = doc.get('filename', '')
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    doc['mimetype'] = 'image/' + filename.split('.')[-1].lower()
                elif filename.lower().endswith('.pdf'):
                    doc['mimetype'] = 'application/pdf'
                else:
                    doc['mimetype'] = 'application/octet-stream'
            
            # Parse extracted_data if it's a string
            if doc.get('extracted_data') and isinstance(doc['extracted_data'], str):
                try:
                    doc['extracted_data'] = json.loads(doc['extracted_data'])
                except:
                    pass
            
            processed_documents.append(doc)
        
        return jsonify({
            "documents": processed_documents,
            "count": len(processed_documents),
            "filters": {
                "company_id": company_id,
                "doctype_id": doctype_id,
                "start_date": start_date,
                "end_date": end_date
            }
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Error fetching documents: {str(e)}"}), 500

@app.route('/documents/company/<int:company_id>/last-month', methods=['GET'])
@jwt_required()
def get_documents_last_month(company_id):
    """Get documents from the last month for a company"""
    try:
        doctype_id = request.args.get('doctype_id', type=int)
        
        documents = db.get_documents_last_month_by_company(
            company_id=company_id,
            doctype_id=doctype_id
        )
        
        # Process documents similar to the filtered endpoint
        processed_documents = []
        for doc in documents:
            if doc.get('file_path') and os.path.exists(doc['file_path']):
                doc['path'] = doc['file_path']
                doc['size'] = os.path.getsize(doc['file_path'])
                
                filename = doc.get('filename', '')
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    doc['mimetype'] = 'image/' + filename.split('.')[-1].lower()
                elif filename.lower().endswith('.pdf'):
                    doc['mimetype'] = 'application/pdf'
                else:
                    doc['mimetype'] = 'application/octet-stream'
            
            if doc.get('extracted_data') and isinstance(doc['extracted_data'], str):
                try:
                    doc['extracted_data'] = json.loads(doc['extracted_data'])
                except:
                    pass
            
            processed_documents.append(doc)
        
        return jsonify({
            "documents": processed_documents,
            "count": len(processed_documents)
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Error fetching documents: {str(e)}"}), 500

@app.route('/documents/company/<int:company_id>/all', methods=['GET'])
@jwt_required()
def get_all_documents_by_company(company_id):
    """Get all documents for a company regardless of document type"""
    try:
        documents = db.get_documents_by_company_all_types(company_id)
        
        # Process documents
        processed_documents = []
        for doc in documents:
            if doc.get('file_path') and os.path.exists(doc['file_path']):
                doc['path'] = doc['file_path']
                doc['size'] = os.path.getsize(doc['file_path'])
                
                filename = doc.get('filename', '')
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    doc['mimetype'] = 'image/' + filename.split('.')[-1].lower()
                elif filename.lower().endswith('.pdf'):
                    doc['mimetype'] = 'application/pdf'
                else:
                    doc['mimetype'] = 'application/octet-stream'
            
            if doc.get('extracted_data') and isinstance(doc['extracted_data'], str):
                try:
                    doc['extracted_data'] = json.loads(doc['extracted_data'])
                except:
                    pass
            processed_documents.append(doc)
        
        return jsonify({
            "documents": processed_documents,
            "count": len(processed_documents)
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Error fetching documents: {str(e)}"}), 500

@app.route('/files/<int:company_id>/<int:doctype_id>/<filename>', methods=['GET'])
@jwt_required()
def download_file(company_id, doctype_id, filename):
    """Serve a file for download from the upload directory"""
    upload_folder = os.path.join(app.config['DMS_UPLOAD_FOLDER'], str(company_id), str(doctype_id))
    file_path = os.path.join(upload_folder, filename)
    if not os.path.exists(file_path):
        abort(404, description="File not found")
    return send_from_directory(upload_folder, filename, as_attachment=True)

# Partner field verification endpoints
@app.route('/partners/check-field', methods=['POST'])
@jwt_required()
def check_partner_field():
    """Check if a specific partner field value already exists"""
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data or 'field_name' not in data or 'field_value' not in data:
        return jsonify({"msg": "field_name and field_value are required"}), 400
    
    field_name = data['field_name']
    field_value = data['field_value']
    exclude_id = data.get('exclude_id')  # For update operations
    
    # Validate field name
    allowed_fields = ['company_name', 'unique_identifier', 'email', 'phone1', 'mailing_address', 'bank_account_number']
    if field_name not in allowed_fields:
        return jsonify({"msg": f"Field {field_name} is not allowed for verification"}), 400
    
    try:
        exists = db.check_partner_field_exists(field_name, field_value, exclude_id)
        return jsonify({
            "exists": exists,
            "field_name": field_name,
            "field_value": field_value
        }), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/partners/check-multiple-fields', methods=['POST'])
@jwt_required()
def check_multiple_partner_fields():
    """Check multiple partner fields for conflicts"""
    current_user_claims = get_jwt()
    if (current_user_claims.get('role') != 'admin' and current_user_claims.get('role') != 'superuser'):
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data or 'fields' not in data:
        return jsonify({"msg": "fields object is required"}), 400
    
    fields = data['fields']
    exclude_id = data.get('exclude_id')  # For update operations
    
    # Validate and check each field
    conflicts = {}
    allowed_fields = ['company_name', 'unique_identifier', 'email', 'phone1', 'mailing_address', 'bank_account_number']
    
    try:
        for field_name, field_value in fields.items():
            if field_name in allowed_fields and field_value:
                exists = db.check_partner_field_exists(field_name, field_value, exclude_id)
                if exists:
                    conflicts[field_name] = {
                        "exists": True,
                        "message": f"Un partenaire avec ce {field_name} existe déjà"
                    }
        
        return jsonify({
            "has_conflicts": len(conflicts) > 0,
            "conflicts": conflicts
        }), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/documents/<int:document_id>/file', methods=['GET', 'OPTIONS'])
@cross_origin()
def download_document_file(document_id):
    if request.method == 'OPTIONS':
        # Handle preflight request - Flask-CORS will handle the headers
        return "", 200

    # For GET requests, verify JWT
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({"msg": "Authentication required"}), 401

    try:
        document = db.get_document_by_id(document_id)
        if not document or not document.get('file_path'):
            return jsonify({"msg": "Document not found"}), 404

        if not os.path.exists(document['file_path']):
            return jsonify({"msg": "File not found on server"}), 404

        return send_file(
            document['file_path'],
            as_attachment=True,
            download_name=document['filename']
        )

    except Exception as e:
        app.logger.error(f"Download error: {str(e)}")
        return jsonify({"msg": "Error downloading file"}), 500

@app.route('/documents/<int:document_id>/rapport', methods=['GET', 'OPTIONS'])
@cross_origin()
def download_document_rapport(document_id):
    if request.method == 'OPTIONS':
        # Handle preflight request - Flask-CORS will handle the headers
        return "", 200

    # For GET requests, verify JWT
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({"msg": "Authentication required"}), 401

    try:
        # Get document and rapport path from the database
        doc = db.get_document_by_id(document_id)
        
        if not doc:
            return jsonify({"msg": "Document not found"}), 404
        
        rapport_path = doc.get('rapport')
        if not rapport_path:
            return jsonify({"msg": "Rapport not found for this document"}), 404
        
        # Check if the rapport file exists
        if not os.path.exists(rapport_path):
            app.logger.error(f"Rapport file not found at path: {rapport_path}")
            return jsonify({"msg": "Rapport file not found on server"}), 404
        
        # Use the original filename, but ensure .pdf extension
        base_filename = os.path.splitext(doc['filename'])[0]
        pdf_filename = f"{base_filename}_rapport.pdf"
        
        return send_file(
            rapport_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=pdf_filename
        )

    except Exception as e:
        app.logger.error(f"Rapport download error: {str(e)}")
        return jsonify({"msg": "Error downloading rapport"}), 500

@app.route('/documents/<int:document_id>/ocr-text', methods=['GET', 'OPTIONS'])
@cross_origin()
def download_document_ocr_text(document_id):
    if request.method == 'OPTIONS':
        # Handle preflight request - Flask-CORS will handle the headers
        return "", 200

    # For GET requests, verify JWT
    try:
        verify_jwt_in_request()
    except Exception as e:
        return jsonify({"msg": "Authentication required"}), 401

    try:
        # Get document and OCR text path from the database
        doc = db.get_document_by_id(document_id)
        
        if not doc:
            return jsonify({"msg": "Document not found"}), 404
        
        ocr_text_path = doc.get('ocr_text')
        if not ocr_text_path:
            return jsonify({"msg": "OCR text not found for this document"}), 404
        
        # Check if the OCR text file exists
        if not os.path.exists(ocr_text_path):
            app.logger.error(f"OCR text file not found at path: {ocr_text_path}")
            return jsonify({"msg": "OCR text file not found on server"}), 404
        
        # Use the original filename, but ensure .txt extension
        base_filename = os.path.splitext(doc['filename'])[0]
        txt_filename = f"{base_filename}_ocr.txt"
        
        return send_file(
            ocr_text_path,
            mimetype='text/plain',
            as_attachment=True,
            download_name=txt_filename
        )

    except Exception as e:
        app.logger.error(f"OCR text download error: {str(e)}")
        return jsonify({"msg": "Error downloading OCR text"}), 500

@app.route('/documents/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_document(document_id):
    """Update document information"""
    current_user_claims = get_jwt()
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    try:
        # Get the current document to verify it exists
        doc = db.get_document_by_id(document_id)
        if not doc:
            return jsonify({"msg": "Document not found"}), 404
        
        # Prepare invoice data if provided
        invoice_data = None
        if 'confirmed_data' in data:
            invoice_data = json.dumps(data['confirmed_data'])
        
        # Update the document
        success = db.update_document(document_id, invoice_data)
        
        if success:
            # Log document update
            log_activity(
                actor=current_user_claims['username'],
                action="Update",
                resource_type="document",
                resource_data={
                    'id': document_id,
                    'filename': doc['filename'],
                    'company_id': doc['company_id']
                }
            )
            return jsonify({"msg": "Document updated successfully"}), 200
        else:
            return jsonify({"msg": "Failed to update document"}), 500
            
    except Exception as e:
        app.logger.error(f"Error updating document {document_id}: {str(e)}")
        return jsonify({"msg": f"Error updating document: {str(e)}"}), 500

@app.route('/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def delete_document(document_id):
    """Delete a document"""
    current_user_claims = get_jwt()
    
    try:
        # Get document info before deletion for logging
        doc = db.get_document_by_id(document_id)
        if not doc:
            return jsonify({"msg": "Document not found"}), 404
        
        # Delete associated files if they exist
        files_to_delete = []
        if doc.get('file_path') and os.path.exists(doc['file_path']):
            files_to_delete.append(doc['file_path'])
        if doc.get('rapport') and os.path.exists(doc['rapport']):
            files_to_delete.append(doc['rapport'])
        if doc.get('ocr_text') and os.path.exists(doc['ocr_text']):
            files_to_delete.append(doc['ocr_text'])
        
        # Delete the document from database
        success = db.delete_document(document_id)
        
        if success:
            # Delete associated files
            for file_path in files_to_delete:
                try:
                    os.remove(file_path)
                    app.logger.info(f"Deleted file: {file_path}")
                except Exception as e:
                    app.logger.warning(f"Could not delete file {file_path}: {str(e)}")
            
            # Log document deletion
            log_activity(
                actor=current_user_claims['username'],
                action="Delete",
                resource_type="document",
                resource_data={
                    'id': document_id,
                    'filename': doc['filename'],
                    'company_id': doc['company_id']
                }
            )
            return jsonify({"msg": "Document deleted successfully"}), 200
        else:
            return jsonify({"msg": "Failed to delete document"}), 500
            
    except Exception as e:
        app.logger.error(f"Error deleting document {document_id}: {str(e)}")
        return jsonify({"msg": f"Error deleting document: {str(e)}"}), 500

@app.route('/cors-test', methods=['GET', 'OPTIONS'])
@cross_origin()
def cors_test():
    return "CORS OK"

def get_rapport_pdf(doc_id):
    
    # Fetch rapport (PDF bytes) and filename from the database
    rapport_bytes = db.get_rapport_pdf(doc_id)
    doc = db.get_document_by_id(doc_id)
    if not rapport_bytes or not doc:
        app.logger.debug(f"[DEBUG] Rapport or document not found for doc_id: {doc_id}")
        return 'Not found', 404
    else:
        app.logger.debug(f"[DEBUG] Rapport PDF size: {len(rapport_bytes)} bytes.")
    # Use the original filename, but ensure .pdf extension
    base_filename = os.path.splitext(doc['filename'])[0]
    pdf_filename = f"{base_filename}.pdf"
    return send_file(
        BytesIO(rapport_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=pdf_filename
    )

@app.route('/companies/by_datatype/<int:datatype_id>', methods=['GET'])

@jwt_required()
def get_companies_by_datatype_route(datatype_id):
    companies = db.get_companies_by_datatype(datatype_id)
    return jsonify(companies), 200


# Group management routes
@app.route('/groups', methods=['GET'])
@jwt_required()
def get_groups():
    """Get all groups"""
    try:
        groups = db.get_all_groups()
        return jsonify(groups), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups', methods=['POST'])
@jwt_required()
def create_group():
    """Create a new group"""
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get('id')
    
    data = request.get_json()
    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Group name is required"}), 400
    
    name = data['name'].strip()
    
    try:
        # Check if group name already exists
        if db.check_group_name_exists(name):
            return jsonify({"msg": "A group with this name already exists"}), 400
        
        group_id = db.create_group(name, current_user_id)
        return jsonify({
            "msg": "Group created successfully",
            "group_id": group_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups/<int:group_id>', methods=['PUT'])
@jwt_required()
def update_group(group_id):
    """Update a group"""
    data = request.get_json()
    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Group name is required"}), 400
    
    name = data['name'].strip()
    
    try:
        # Check if group exists
        group = db.get_group_by_id(group_id)
        if not group:
            return jsonify({"msg": "Group not found"}), 404
        
        # Check if new name already exists (excluding current group)
        if db.check_group_name_exists(name, exclude_id=group_id):
            return jsonify({"msg": "A group with this name already exists"}), 400
        
        success = db.update_group(group_id, name)
        if success:
            return jsonify({"msg": "Group updated successfully"}), 200
        else:
            return jsonify({"msg": "Failed to update group"}), 500
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups/<int:group_id>', methods=['DELETE'])
@jwt_required()
def delete_group(group_id):
    """Delete a group"""
    try:
        # Check if group exists
        group = db.get_group_by_id(group_id)
        if not group:
            return jsonify({"msg": "Group not found"}), 404
        
        success = db.delete_group(group_id)
        if success:
            return jsonify({"msg": "Group deleted successfully"}), 200
        else:
            return jsonify({"msg": "Failed to delete group"}), 500
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups/<int:group_id>/documents', methods=['POST'])
@jwt_required()
def add_documents_to_group(group_id):
    """Add documents to a group"""
    data = request.get_json()
    if not data or 'document_ids' not in data or not isinstance(data['document_ids'], list):
        return jsonify({"msg": "document_ids array is required"}), 400
    
    document_ids = data['document_ids']
    if not document_ids:
        return jsonify({"msg": "At least one document ID is required"}), 400
    
    try:
        # Check if group exists
        group = db.get_group_by_id(group_id)
        if not group:
            return jsonify({"msg": "Group not found"}), 404
        
        success = db.add_documents_to_group(group_id, document_ids)
        if success:
            return jsonify({"msg": "Documents added to group successfully"}), 200
        else:
            return jsonify({"msg": "Failed to add documents to group"}), 500
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups/<int:group_id>/documents/<int:document_id>', methods=['DELETE'])
@jwt_required()
def remove_document_from_group(group_id, document_id):
    """Remove a document from a group"""
    try:
        success = db.remove_document_from_group(document_id, group_id)
        if success:
            return jsonify({"msg": "Document removed from group successfully"}), 200
        else:
            return jsonify({"msg": "Failed to remove document from group"}), 500
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/groups/<int:group_id>/documents', methods=['GET'])
@jwt_required()
def get_documents_by_group(group_id):
    """Get all documents in a group"""
    try:
        # Check if group exists
        group = db.get_group_by_id(group_id)
        if not group:
            return jsonify({"msg": "Group not found"}), 404
        
        documents = db.get_documents_by_group(group_id)
        return jsonify({
            "group": group,
            "documents": documents,
            "count": len(documents)
        }), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/documents/<int:document_id>/groups', methods=['GET'])
@jwt_required()
def get_groups_by_document(document_id):
    """Get all groups that contain a specific document"""
    try:
        # Check if document exists
        document = db.get_document_by_id(document_id)
        if not document:
            return jsonify({"msg": "Document not found"}), 404
        
        groups = db.get_groups_by_document(document_id)
        return jsonify({
            "document": document,
            "groups": groups,
            "count": len(groups)
        }), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

SETTINGS_ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.json
    env_map = {
        "systemEnabled": "SYSTEM_ENABLED",
        "systemName": "SYSTEM_NAME",
        "dbHost": "SYSTEM_DB_HOST",
        "dbUsername": "SYSTEM_DB_USERNAME",
        "dbPassword": "SYSTEM_DB_PASSWORD",
        "maxUsers": "SYSTEM_MAX_USERS",
        "maxEntities": "SYSTEM_MAX_ENTITIES",
        "maxExternalEntities": "SYSTEM_MAX_EXTERNAL_ENTITIES",
        "maxFileSize": "SYSTEM_MAX_FILE_SIZE",
        "logsPath": "SYSTEM_LOGS_PATH",
        "entitiesDataPath": "ENTITIES_DATA_PATH",
        "entityLogPath": "ENTITY_LOG_PATH",
        "externalEntitiesDataPath": "EXTERNAL_ENTITIES_DATA_PATH",
        "externalEntitiesLogPath": "EXTERNAL_ENTITIES_LOG_PATH"
    }
    # Read current .env
    env_vars = {}
    if os.path.exists(SETTINGS_ENV_PATH):
        with open(SETTINGS_ENV_PATH, "r") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    env_vars[k] = v
    # Update with new values
    for key, env_key in env_map.items():
        if key in data:
            env_vars[env_key] = str(data[key])
    # Write back to .env
    with open(SETTINGS_ENV_PATH, "w") as f:
        for k, v in env_vars.items():
            f.write(f"{k}={v}\n")
    return jsonify({"success": True, "message": "Settings updated."})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    env_map = {
        "systemEnabled": "SYSTEM_ENABLED",
        "systemName": "SYSTEM_NAME",
        "dbHost": "SYSTEM_DB_HOST",
        "dbUsername": "SYSTEM_DB_USERNAME",
        "dbPassword": "SYSTEM_DB_PASSWORD",
        "maxUsers": "SYSTEM_MAX_USERS",
        "maxEntities": "SYSTEM_MAX_ENTITIES",
        "maxExternalEntities": "SYSTEM_MAX_EXTERNAL_ENTITIES",
        "maxFileSize": "SYSTEM_MAX_FILE_SIZE",
        "logsPath": "SYSTEM_LOGS_PATH",
        "entitiesDataPath": "ENTITIES_DATA_PATH",
        "entityLogPath": "ENTITY_LOG_PATH",
        "externalEntitiesDataPath": "EXTERNAL_ENTITIES_DATA_PATH",
        "externalEntitiesLogPath": "EXTERNAL_ENTITIES_LOG_PATH"
    }
    env_vars = {k: '' for k in env_map.keys()}
    if os.path.exists(SETTINGS_ENV_PATH):
        with open(SETTINGS_ENV_PATH, "r") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    for frontend_key, env_key in env_map.items():
                        if k == env_key:
                            env_vars[frontend_key] = v
    # Convert booleans and numbers
    env_vars["systemEnabled"] = env_vars["systemEnabled"].lower() == "true"
    for key in ["maxUsers", "maxEntities", "maxExternalEntities", "maxFileSize"]:
        try:
            env_vars[key] = int(env_vars[key])
        except:
            pass
    return jsonify(env_vars)


# Email management routes
@app.route('/users/email-selection', methods=['GET'])
@jwt_required()
def get_users_for_email():
    """Get all users for email selection"""
    try:
        company_id = request.args.get('company_id', type=int)
        
        if company_id:
            # Get users associated with specific company
            users = db.get_users_by_company(company_id)
        else:
            # Get all active users
            users = db.get_users_for_email_selection()
        
        return jsonify({
            "users": users,
            "count": len(users)
        }), 200
    except Exception as e:
        return jsonify({"msg": f"Error fetching users: {str(e)}"}), 500

@app.route('/documents/<int:document_id>/send-email', methods=['POST'])
@jwt_required()
def send_document_email(document_id):
    """Send document via email to selected users"""
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get('id')
    current_username = current_user_claims.get('username', 'Unknown')
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    recipient_emails = data.get('recipients', [])
    email_type = data.get('email_type', 'document')  # 'document', 'rapport', 'ocr_text'
    subject = data.get('subject', '')
    message = data.get('message', '')
    
    if not recipient_emails:
        return jsonify({"msg": "At least one recipient is required"}), 400
    
    if email_type not in ['document', 'rapport', 'ocr_text']:
        return jsonify({"msg": "Invalid email type"}), 400
    
    try:
        # Get document details
        document = db.get_document_with_details(document_id)
        if not document:
            return jsonify({"msg": "Document not found"}), 404
        
        # Prepare email content
        if not subject:
            subject = f"Document: {document['filename']}"
        
        # Create email body
        email_body = f"""
Bonjour,

{message if message else f"Veuillez trouver ci-joint le document demandé."}

Détails du document:
- Nom du fichier: {document['filename']}
- Entreprise: {document.get('company_name', 'N/A')}
- Type de document: {document.get('doctype_name', 'N/A')}
- Date de création: {document['created_at']}
"""
        
        if document.get('partner_name'):
            email_body += f"- Partenaire: {document['partner_name']}\n"
        
        if document.get('is_invoice') and document.get('invoice_number'):
            email_body += f"- Numéro de facture: {document['invoice_number']}\n"
        
        email_body += f"""
Envoyé par: {current_username}
Système de Gestion Documentaire - RAN ESMERALD

Cordialement,
L'équipe RAN ESMERALD
"""
        
        # Determine attachment path based on email type
        attachment_path = None
        attachment_name = None
        
        if email_type == 'document' and document.get('file_path'):
            attachment_path = document['file_path']
            attachment_name = document['filename']
        elif email_type == 'rapport' and document.get('rapport'):
            attachment_path = document['rapport']
            attachment_name = f"{os.path.splitext(document['filename'])[0]}_rapport.pdf"
        elif email_type == 'ocr_text' and document.get('ocr_text'):
            attachment_path = document['ocr_text']
            attachment_name = f"{os.path.splitext(document['filename'])[0]}_ocr.txt"
        
        if not attachment_path or not os.path.exists(attachment_path):
            return jsonify({"msg": f"Le fichier {email_type} n'est pas disponible pour ce document"}), 404
        
        # Send email to each recipient
        smtp_host = "smtp.gmail.com"
        smtp_port = 587
        smtp_user = "ranesmerald358@gmail.com"
        smtp_pass = "tvkw cnff wpge eccz"
        
        successful_sends = []
        failed_sends = []
        
        for recipient_email in recipient_emails:
            try:
                msg = MIMEMultipart()
                msg["From"] = smtp_user
                msg["To"] = recipient_email
                msg["Subject"] = subject
                
                # Attach text body
                msg.attach(MIMEText(email_body, "plain", "utf-8"))
                
                # Attach file
                with open(attachment_path, "rb") as attachment:
                    from email.mime.base import MIMEBase
                    from email import encoders
                    
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment_name}'
                    )
                    msg.attach(part)
                
                # Send email
                server = smtplib.SMTP(smtp_host, smtp_port)
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, recipient_email, msg.as_string())
                server.quit()
                
                successful_sends.append(recipient_email)
                
            except Exception as e:
                failed_sends.append({"email": recipient_email, "error": str(e)})
        
        # Log email activity
        try:
            status = "sent" if successful_sends and not failed_sends else "failed"
            db.log_email_activity(document_id, current_user_id, recipient_emails, email_type, status)
        except Exception as log_error:
            print(f"Error logging email activity: {log_error}")
        
        # Log activity
        log_activity(
            actor=current_username,
            action="Send Email",
            resource_type="document",
            resource_data={
                'id': document_id,
                'filename': document['filename'],
                'company_id': document['company_id'],
                'email_type': email_type,
                'recipients_count': len(successful_sends),
                'failed_count': len(failed_sends)
            }
        )
        
        if successful_sends and not failed_sends:
            return jsonify({
                "msg": f"Email envoyé avec succès à {len(successful_sends)} destinataire(s)",
                "successful_sends": successful_sends
            }), 200
        elif successful_sends and failed_sends:
            return jsonify({
                "msg": f"Email partiellement envoyé. Succès: {len(successful_sends)}, Échecs: {len(failed_sends)}",
                "successful_sends": successful_sends,
                "failed_sends": failed_sends
            }), 207  # Multi-status
        else:
            return jsonify({
                "msg": "Échec de l'envoi de tous les emails",
                "failed_sends": failed_sends
            }), 500
            
    except Exception as e:
        return jsonify({"msg": f"Erreur lors de l'envoi de l'email: {str(e)}"}), 500

@app.route('/documents/<int:document_id>/email-info', methods=['GET'])
@jwt_required()
def get_document_email_info(document_id):
    """Get document information for email sending"""
    try:
        document = db.get_document_with_details(document_id)
        if not document:
            return jsonify({"msg": "Document not found"}), 404
        
        # Check available email types
        available_types = []
        
        if document.get('file_path') and os.path.exists(document['file_path']):
            available_types.append({
                "type": "document",
                "label": "Document original",
                "description": f"Fichier: {document['filename']}"
            })
        
        if document.get('rapport') and os.path.exists(document['rapport']):
            available_types.append({
                "type": "rapport",
                "label": "Rapport PDF",
                "description": "Rapport généré automatiquement"
            })
        
        if document.get('ocr_text') and os.path.exists(document['ocr_text']):
            available_types.append({
                "type": "ocr_text",
                "label": "Texte OCR",
                "description": "Texte extrait du document"
            })
        
        return jsonify({
            "document": {
                "id": document['id'],
                "filename": document['filename'],
                "company_name": document.get('company_name'),
                "doctype_name": document.get('doctype_name'),
                "partner_name": document.get('partner_name'),
                "is_invoice": document.get('is_invoice', False),
                "invoice_number": document.get('invoice_number'),
                "created_at": document['created_at']
            },
            "available_types": available_types
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Error fetching document info: {str(e)}"}), 500

if __name__ == '__main__':
    # Ensure log directory exists when app starts
    ensure_log_dir()
    
    # Print all registered routes for debugging
    
    
    
    app.run(host='0.0.0.0', debug=True)