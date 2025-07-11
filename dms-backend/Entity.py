
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from db import db
from utils import log_activity
import os
from werkzeug.utils import secure_filename

company_bp = Blueprint("company_bp", __name__)

# Helper function for creating company/doctype folders (moved from app.py)
def create_company_doctype_folders(company_name, doctype_name):
    # Sanitize names to prevent path traversal
    safe_company_name = secure_filename(company_name)
    safe_doctype_name = secure_filename(doctype_name)
    
    # Create the main folder structure: /dms/upload/<company>/<doctype>/
    # Assuming DMS_UPLOAD_FOLDER is accessible via app.config or passed as an argument
    # For now, hardcode or pass it from app.py
    DMS_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dms-data/upload'))
    
    company_folder = os.path.join(DMS_UPLOAD_FOLDER, safe_company_name)
    doctype_folder = os.path.join(company_folder, safe_doctype_name)
    summary_folder = os.path.join(doctype_folder, 'summary')
    
    # Create all folders
    os.makedirs(company_folder, exist_ok=True)
    os.makedirs(doctype_folder, exist_ok=True)
    os.makedirs(summary_folder, exist_ok=True)
    
    return company_folder, doctype_folder, summary_folder

@company_bp.route("/companies", methods=["POST"])
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
            # DMS_UPLOAD_FOLDER needs to be passed or accessed globally
            # For now, re-define it or ensure it's accessible
            DMS_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../dms-data/upload'))
            safe_company_name = secure_filename(company['name'])
            company_folder = os.path.join(DMS_UPLOAD_FOLDER, safe_company_name)
            os.makedirs(company_folder, exist_ok=True)
        
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
    
@company_bp.route("/companies/<int:company_id>", methods=["PUT"])
@jwt_required()
def update_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
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
            phone=data.get('phone')
        )
        
        company = db.get_company_by_id(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404
            
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

@company_bp.route("/companies/<int:company_id>", methods=["DELETE"])
@jwt_required()
def delete_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
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

@company_bp.route("/companies", methods=["GET"])
@jwt_required()
def get_companies():
    try:
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        if user_role == 'admin':
            companies = db.get_all_companies()
        else:
            companies = db.get_user_companies(current_user_id)

        return jsonify(companies), 200

    except Exception as e:
        # app.logger.error(f"Error in /companies: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500
    
@company_bp.route("/companies/<int:user_id>", methods=["get"])
def get_companies_by_user(user_id):
    try:
        companies = db.get_user_companies(user_id)
        return jsonify(companies), 200
    except Exception as e:
        # app.logger.error(f"Error in /companies: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


