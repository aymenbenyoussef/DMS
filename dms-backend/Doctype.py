from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from utils import log_activity
import os
from werkzeug.utils import secure_filename
from utils import create_company_doctype_folders

doctype_bp = Blueprint("doctype_bp", __name__)

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

@doctype_bp.route('/doctype', methods=['POST'])
@jwt_required()
def create_doctype():
    current_user_claims = get_jwt()
    data = request.get_json()
    if not data or 'name' not in data or not data['name'].strip():
        return jsonify({"msg": "Name is required"}), 400

    try:
        existing = db.get_doctype_by_name(data['name'].strip())
        if existing:
            return jsonify({"msg": "A document type with this name already exists."}), 400

        doctype_id = db.create_doctype(data)
        
        doctype = db.get_doctype_by_id(doctype_id)
        companies = data.get('companies', [])
        
        for company_id in companies:
            company = db.get_company_by_id(company_id)
            if company:
                create_company_doctype_folders(company['name'], doctype['name'])

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

@doctype_bp.route('/doctype/<int:doctype_id>/companies', methods=['GET'])
@jwt_required()
def get_doctype_companies(doctype_id):
    try:
        companies = db.get_companies_by_datatype(doctype_id)
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route('/doctype', methods=['GET'])
@jwt_required()
def get_doctypes():
    try:
        doctypes = db.get_all_doctypes()
        result = []
        for doctype in doctypes:
            companies = db.get_companies_by_datatype(doctype['id'])
            doctype['companies'] = companies
            result.append(doctype)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route('/doctype/<int:doctype_id>', methods=['PUT'])
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

@doctype_bp.route('/doctype/<int:doctype_id>', methods=['DELETE'])
@jwt_required()
def delete_doctype(doctype_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403

    try:
        doctype = db.get_doctype_by_id(doctype_id)
        if not doctype:
            return jsonify({"msg": "Document type not found"}), 404
        
        success = db.delete_doctype(doctype_id)
        if success:
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
           
@doctype_bp.route('/folders', methods=['GET'])
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

@doctype_bp.route('/folders', methods=['POST'])
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

@doctype_bp.route('/folders/<int:folder_id>', methods=['PUT'])
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

@doctype_bp.route('/folders/<int:folder_id>', methods=['DELETE'])
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


