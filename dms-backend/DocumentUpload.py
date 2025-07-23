from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from db import db
from werkzeug.utils import secure_filename
import os
import shutil
from pdf2image import convert_from_bytes
from ocr_utils import process_uploaded_files, generate_report_pdf, extract_invoice_data
import json
import pytesseract
from PIL import Image
import glob
from datetime import datetime
from app_utils import log_activity, create_company_doctype_folders, DMS_UPLOAD_FOLDER, TEMP_UPLOAD_FOLDER, ALLOWED_EXTENSIONS

document_upload_bp = Blueprint("document_upload_bp", __name__)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def process_single_file_ocr(file, company_id, doctype_id):
    try:
        filename = secure_filename(file.filename)
        timestamp = int(datetime.now().timestamp())
        unique_filename = f"{timestamp}_{filename}"
        temp_file_path = os.path.join(TEMP_UPLOAD_FOLDER, unique_filename)
        
        file.save(temp_file_path)
        
        text = ""
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff")):
            image = Image.open(temp_file_path).convert("RGB")
            text = pytesseract.image_to_string(image, lang="fra+eng")
        elif filename.lower().endswith(".pdf"):
            with open(temp_file_path, "rb") as pdf_file:
                images = convert_from_bytes(pdf_file.read())
                for img in images:
                    text += pytesseract.image_to_string(img, lang="fra+eng") + "\n"
        
        text_filename = f"{os.path.splitext(unique_filename)[0]}.txt"
        text_path = os.path.join(TEMP_UPLOAD_FOLDER, text_filename)
        with open(text_path, "w", encoding="utf-8") as f:
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
        return {
            "filename": file.filename,
            "error": str(e)
        }

@document_upload_bp.route("/documents", methods=["GET"])
@jwt_required()
def get_documents():
    company_id = request.args.get("company_id")
    
    if not company_id:
        return jsonify({"msg": "Company ID is required"}), 400

    try:
        documents = db.get_documents_by_company(company_id)
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@document_upload_bp.route("/documents", methods=["POST"])
@jwt_required()
def create_document():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get("id")

    company_id = request.form.get("company_id")
    document_type = request.form.get("document_type")
    folder_id = request.form.get("folder_id")
    
    if not company_id or not document_type:
        return jsonify({"msg": "Missing company_id or document_type"}), 400

    if document_type not in ["invoice", "non_invoice"]:
        return jsonify({"msg": "Invalid document type"}), 400

    if "file" not in request.files:
        return jsonify({"msg": "No file part"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"msg": "No selected file"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(TEMP_UPLOAD_FOLDER, filename)
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
        db.add_document_history(document_id, current_user_id, "Document created")
        
        log_activity(
            actor=current_user_claims["username"],
            action="Create",
            resource_type="document",
            resource_data={
                "id": document_id,
                "filename": filename,
                "company_id": company_id
            }
        )
        
        return jsonify({
            "msg": "Document created successfully",
            "document_id": document_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@document_upload_bp.route("/documents/company/<int:company_id>/type/<int:doctype_id>", methods=["GET"])
@jwt_required()
def get_documents_by_company_and_type(company_id, doctype_id):
    try:
        doctype_folder = os.path.join(DMS_UPLOAD_FOLDER, str(company_id), str(doctype_id))

        if not os.path.exists(doctype_folder):
            return jsonify({"documents": [], "msg": "No such folder"}), 404

        all_files = glob.glob(os.path.join(doctype_folder, "*.*"))
        
        filtered_files = [f for f in all_files 
                        if os.path.isfile(f) 
                        and not f.lower().endswith(".txt")]

        documents = []
        for file_path in filtered_files:
            filename = os.path.basename(file_path)
            documents.append({
                "filename": filename,
                "path": file_path,
                "size": os.path.getsize(file_path),
                "created_at": datetime.fromtimestamp(os.path.getctime(file_path)).strftime("%Y-%m-%d %H:%M:%S"),
                "file_type": os.path.splitext(filename)[1][1:].upper()
            })

        return jsonify({
            "documents": documents,
            "count": len(documents)
        }), 200

    except Exception as e:
        return jsonify({"msg": f"Error reading files: {str(e)}"}), 500

@document_upload_bp.route("/upload_single", methods=["POST"])
@jwt_required()
def upload_single_file():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get("id")
    company_id = request.form.get("company_id")
    doctype_id = request.form.get("doctype_id")
    
    if not company_id or not doctype_id:
        return jsonify({"msg": "Company ID and document type ID are required"}), 400
    
    if "file" not in request.files:
        return jsonify({"msg": "No file uploaded"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"msg": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"msg": f"Invalid file type: {file.filename}"}), 400
    
    try:
        processed_file = process_single_file_ocr(file, company_id, doctype_id)
        
        if "error" in processed_file:
            return jsonify({"msg": f"Processing error: {processed_file["error"]}"}), 500
        
        session_id = f"{current_user_id}_{int(datetime.now().timestamp())}"
        temp_data = {
            "session_id": session_id,
            "company_id": company_id,
            "doctype_id": doctype_id,
            "processed_file": processed_file,
            "user_id": current_user_id
        }
        
        temp_file_path = os.path.join(TEMP_UPLOAD_FOLDER, f"temp_{session_id}.json")
        with open(temp_file_path, "w", encoding="utf-8") as f:
            json.dump(temp_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "msg": "File processed successfully and stored temporarily. Awaiting confirmation.",
            "session_id": session_id,
            "extracted_data": processed_file["extracted_data"]
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Processing error: {str(e)}"}), 500

@document_upload_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_files():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get("id")
    
    company_id = request.form.get("company_id")
    doctype_id = request.form.get("doctype_id")
    
    if not company_id or not doctype_id:
        return jsonify({"msg": "Company ID and document type ID are required"}), 400
    
    files = request.files.getlist("files")
    if not files or all(file.filename == "" for file in files):
        return jsonify({"msg": "No files selected"}), 400
    
    invalid_files = [file.filename for file in files if file.filename != "" and not allowed_file(file.filename)]
    if invalid_files:
        return jsonify({"msg": f"Invalid file types: {", ".join(invalid_files)}"}), 400
    
    try:
        company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_id, doctype_id)
        
        processed_files = process_uploaded_files(files, TEMP_UPLOAD_FOLDER, company_id, doctype_id)

        session_id = f"{current_user_id}_{int(datetime.now().timestamp())}"

        if not isinstance(processed_files, list):
            return jsonify({"msg": "Invalid processed files format"}), 500
        forms_data = []    
        for pf in processed_files:
            if not isinstance(pf, dict):
                return jsonify({"msg": "Invalid processed file format"}), 500
            if "filename" not in pf or "extracted_data" not in pf:
                form_data = {
                    "filename": pf["filename"],
                    "company_id": company_id,
                    "doctype_id": doctype_id,
                    "extracted_data": pf["extracted_data"]
                }
                forms_data.append(form_data)
        
        return jsonify({
            "msg": "Files processed successfully", 
            "session_id": session_id,
            "forms_data": forms_data
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Processing error: {str(e)}"}), 500

@document_upload_bp.route("/confirm_document", methods=["POST"])
@jwt_required()
def confirm_document():
    current_user_claims = get_jwt()
    current_user_id = current_user_claims.get("id")
    data = request.get_json()
    
    session_id = data.get("session_id")
    confirmed_documents = data.get("documents", [])
    
    if not session_id or not confirmed_documents:
        return jsonify({"msg": "Session ID and documents data are required"}), 400
    
    try:
        temp_file_path_session = os.path.join(TEMP_UPLOAD_FOLDER, f"temp_{session_id}.json")
        if not os.path.exists(temp_file_path_session):
            return jsonify({"msg": "Session expired or invalid"}), 400
        
        with open(temp_file_path_session, "r", encoding="utf-8") as f:
            temp_data = json.load(f)
        
        saved_documents = []
        
        for doc_data in confirmed_documents:
            filename = doc_data["filename"]
            company_id = doc_data.get("company_id") or temp_data.get("company_id")
            doctype_id = doc_data.get("doctype_id") or temp_data.get("doctype_id")
            is_invoice = doc_data.get("is_invoice", False)
            confirmed_info = doc_data.get("confirmed_data", {})
            partner_id = doc_data.get("partner_id")
            
            if not company_id or not doctype_id:
                saved_documents.append({
                    "filename": filename,
                    "error": "Company ID and Document Type ID are required"
                })
                continue
            
            try:
                company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_id, doctype_id)
                
                original_processed_file = None
                if "processed_file" in temp_data:
                    original_processed_file = temp_data["processed_file"]
                elif "processed_files" in temp_data:
                    for pf in temp_data["processed_files"]:
                        if pf["filename"] == filename:
                            original_processed_file = pf
                            break

                if not original_processed_file:
                    saved_documents.append({
                        "filename": filename,
                        "error": "Original file data not found"
                    })
                    continue

                temp_file_path = original_processed_file.get("temp_file_path")
                if not temp_file_path or not os.path.exists(temp_file_path):
                    saved_documents.append({
                        "filename": filename,
                        "error": "Temporary file not found"
                    })
                    continue

                final_filename = original_processed_file.get("original_filename", filename)
                timestamp = int(datetime.now().timestamp())
                unique_final_filename = f"{timestamp}_{final_filename}"
                final_file_path = os.path.join(doctype_folder, unique_final_filename)
                shutil.move(temp_file_path, final_file_path)

                final_text_path = None
                if temp_text_path and os.path.exists(temp_text_path):
                    final_text_filename = f"{os.path.splitext(unique_final_filename)[0]}.txt"
                    final_text_path = os.path.join(doctype_folder, final_text_filename)
                    shutil.move(temp_text_path, final_text_path)

                file_size = os.path.getsize(final_file_path) if os.path.exists(final_file_path) else 0

                if partner_id:
                    confirmed_info["partner_id"] = partner_id

                # Prepare fields for insertion
                ocr_text = final_text_path if final_text_path and os.path.exists(final_text_path) else None
                rapport = None
                extracted_data = None
                if is_invoice and confirmed_info:
                    extracted_data = confirmed_info
                    # Generate rapport PDF for invoices
                    report_filename = f"{os.path.splitext(unique_final_filename)[0]}_report.pdf"
                    report_path = os.path.join(summary_folder, report_filename)
                    generate_report_pdf(confirmed_info, report_path, unique_final_filename)
                    rapport = report_path
                # For contracts (not invoices), set fields to None
                document_id = db.create_document_with_ocr_data(
                    owner_id=current_user_id,
                    company_id=company_id,
                    doctype_id=doctype_id,
                    filename=unique_final_filename,
                    file_path=final_file_path,
                    file_size=file_size,
                    is_invoice=is_invoice,
                    extracted_data=extracted_data,
                    partner_id=partner_id,
                    rapport=rapport,
                    ocr_text=ocr_text
                )
                
                if not document_id:
                    raise Exception("Failed to create document in database")
                
                if is_invoice and confirmed_info:
                    report_filename = f"{os.path.splitext(unique_final_filename)[0]}_report.pdf"
                    report_path = os.path.join(summary_folder, report_filename)
                    generate_report_pdf(confirmed_info, report_path, unique_final_filename)
                
                json_filename = f"{os.path.splitext(unique_final_filename)[0]}_summary.json"
                json_path = os.path.join(summary_folder, json_filename)
                
                company = db.get_company_by_id(company_id)
                doctype = db.get_doctype_by_id(doctype_id)
                
                with open(json_path, "w", encoding="utf-8") as json_file:
                    json.dump({
                        "filename": unique_final_filename,
                        "original_filename": final_filename,
                        "processing_date": datetime.now().isoformat(),
                        "company": {
                            "id": company_id,
                            "name": company.get("name") if company else "Unknown"
                        },
                        "document_type": {
                            "id": doctype_id,
                            "name": doctype.get("name") if doctype else "Unknown"
                        },
                        "is_invoice": is_invoice,
                        "partner_id": partner_id,
                        "confirmed_data": confirmed_info,
                        "file_info": {
                            "path": final_file_path,
                            "size": file_size
                        }
                    }, json_file, ensure_ascii=False, indent=2)
                
                log_activity(
                    actor=current_user_claims.get("username", "Unknown"),
                    action="Create",
                    resource_type="document",
                    resource_data={
                        "id": document_id,
                        "filename": unique_final_filename,
                        "company_id": company_id,
                        "doctype_id": doctype_id,
                        "is_invoice": is_invoice,
                        "partner_id": partner_id,
                        "invoice_number": confirmed_info.get("invoice_number") if is_invoice else None
                    }
                )
                
                saved_documents.append({
                    "document_id": document_id,
                    "filename": unique_final_filename,
                    "original_filename": final_filename,
                    "is_invoice": is_invoice,
                    "partner_id": partner_id,
                    "final_path": final_file_path
                })
                
            except Exception as e:
                saved_documents.append({
                    "filename": filename,
                    "error": str(e)
                })
        
        try:
            os.remove(temp_file_path_session)
        except:
            pass
        
        return jsonify({
            "msg": "Documents confirmed and saved successfully",
            "saved_documents": saved_documents
        }), 200
        
    except Exception as e:
        return jsonify({"msg": f"Confirmation error: {str(e)}"}), 500

@document_upload_bp.route("/folders", methods=["POST"])
@jwt_required()
def create_folder():
    claims = get_jwt()
    current_user_id = claims.get("id")
    data = request.get_json()
    
    required_fields = ["name", "company_id"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({"msg": "Missing required fields"}), 400

    try:
        folder_id = db.create_folder(
            name=data["name"],
            created_by=current_user_id,
            company_id=data["company_id"],
            parent_id=data.get("parent_id")
        )
        folder = db.get_folder_by_id(folder_id)
        return jsonify({
            "msg": "Folder created successfully",
            "folder": folder
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@document_upload_bp.route("/folders/<int:folder_id>", methods=["PUT"])
@jwt_required()
def update_folder(folder_id):
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    try:
        success = db.update_folder(
            folder_id=folder_id,
            name=data.get("name"),
            parent_id=data.get("parent_id")
        )
        if success:
            return jsonify({"msg": "Folder updated successfully"}), 200
        else:
            return jsonify({"msg": "Folder not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@document_upload_bp.route("/folders/<int:folder_id>", methods=["DELETE"])
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

@document_upload_bp.route("/folders", methods=["GET"])
@jwt_required()
def get_datatypes():
    company_id = request.args.get("company_id")    
    try:
        if company_id:
            folders = db.get_datatypes_by_company(company_id)
        else:
            return jsonify({"msg": "company_id is required"}), 400
        
        return jsonify(folders), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500


