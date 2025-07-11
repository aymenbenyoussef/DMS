
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from db import db
from utils import log_activity, allowed_file, process_single_file_ocr, create_company_doctype_folders
import os
from werkzeug.utils import secure_filename
import json
from ocr_utils import process_uploaded_files, generate_report_pdf
from datetime import datetime
from flask import app
document_bp = Blueprint("document_bp", __name__)

@document_bp.route("/documents", methods=["GET"])
@jwt_required()
def get_documents():
    current_user = get_jwt_identity()
    company_id = request.args.get("company_id")
    
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

# ====== NEW SINGLE FILE UPLOAD ENDPOINT ======
@app.route('/upload_single', methods=['POST'])
@jwt_required()
def upload_single_file():
    """Upload and process a single file with OCR"""
    current_user_claims = get_jwt()
    current_user = get_jwt_identity()
    current_user_id = current_user_claims.get('id')
    # Get form data
    company_name = request.form.get('company')
    doctype_name = request.form.get('doctype')
    
    if not company_name or not doctype_name:
        return jsonify({"msg": "Company and document type are required"}), 400
    
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
        processed_file = process_single_file_ocr(file, company_name, doctype_name)
        
        if 'error' in processed_file:
            return jsonify({"msg": f"Processing error: {processed_file['error']}"}), 500
        
        # Save processing results to temporary storage for confirmation
        session_id = f"{current_user_id}_{int(datetime.now().timestamp())}"
        temp_data = {
            'session_id': session_id,
            'company': company_name,
            'doctype': doctype_name,
            'processed_file': processed_file,
            'user_id': current_user_id
        }
        
        # Store in temporary file
        temp_file_path = os.path.join(app.config['TEMP_UPLOAD_FOLDER'], f"temp_{session_id}.json")
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            json.dump(temp_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "msg": "File processed successfully",
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
    company_name = request.form.get('company')
    doctype_name = request.form.get('doctype')
    
    if not company_name or not doctype_name:
        return jsonify({"msg": "Company and document type are required"}), 400
    
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
        company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_name, doctype_name)
        
        # Process files with OCR
        processed_files = process_uploaded_files(files, app.config['TEMP_UPLOAD_FOLDER'], company_name, doctype_name)
        
        # Save processing results to temporary storage for confirmation
        session_id = f"{current_user['id']}_{int(datetime.now().timestamp())}"
        temp_data = {
            'session_id': session_id,
            'company': company_name,
            'doctype': doctype_name,
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
                    'company': company_name,
                    'doctype': doctype_name,
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

@document_bp.route("/confirm_document", methods=["POST"])
@jwt_required()
def confirm_document():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    session_id = data.get("session_id")
    confirmed_documents = data.get("documents", [])
    
    if not session_id or not confirmed_documents:
        return jsonify({"msg": "Session ID and documents data are required"}), 400
    
    try:
        TEMP_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
        temp_file_path = os.path.join(TEMP_UPLOAD_FOLDER, f"temp_{session_id}.json")
        if not os.path.exists(temp_file_path):
            return jsonify({"msg": "Session expired or invalid"}), 400
        
        with open(temp_file_path, "r", encoding="utf-8") as f:
            temp_data = json.load(f)
        
        company_name = temp_data["company"]
        doctype_name = temp_data["doctype"]
        
        company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_name, doctype_name)
        
        saved_documents = []
        
        for doc_data in confirmed_documents:
            filename = doc_data["filename"]
            is_invoice = doc_data.get("is_invoice", False)
            confirmed_info = doc_data.get("confirmed_data", {})
            if "vendor" in confirmed_info:
                confirmed_info["partner"] = confirmed_info.pop("vendor")
            if "client" in confirmed_info:
                confirmed_info["partner_id"] = confirmed_info.pop("client")
            
            try:
                document_id = db.create_document_with_ocr_data(
                    owner_id=current_user["id"],
                    company_name=company_name,
                    doctype_name=doctype_name,
                    filename=filename,
                    is_invoice=is_invoice,
                    extracted_data=confirmed_info
                )
                
                if is_invoice and confirmed_info:
                    report_filename = f"{os.path.splitext(filename)[0]}_report.pdf"
                    report_path = os.path.join(summary_folder, report_filename)
                    generate_report_pdf(confirmed_info, report_path, filename)
                
                json_filename = f"{os.path.splitext(filename)[0]}_summary.json"
                json_path = os.path.join(summary_folder, json_filename)
                with open(json_path, "w", encoding="utf-8") as json_file:
                    json.dump({
                        "filename": filename,
                        "processing_date": datetime.now().isoformat(),
                        "is_invoice": is_invoice,
                        "confirmed_data": confirmed_info
                    }, json_file, ensure_ascii=False, indent=2)
                
                current_user_claims = get_jwt()
                log_activity(
                    actor=current_user_claims.get("username", "Unknown"),
                    action="Create",
                    resource_type="document",
                    resource_data={
                        "id": document_id,
                        "filename": filename,
                        "company_id": company_name
                    }
                )
                
                saved_documents.append({
                    "document_id": document_id,
                    "filename": filename,
                    "is_invoice": is_invoice
                })
                
            except Exception as e:
                saved_documents.append({
                    "filename": filename,
                    "error": str(e)
                })
        
        os.remove(temp_file_path)
        
        return jsonify({
            "msg": "Documents confirmed and saved successfully",
            "saved_documents": saved_documents
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Confirmation error: {str(e)}"}), 500