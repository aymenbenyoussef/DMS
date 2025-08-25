
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from app_utils import log_activity, create_company_doctype_folders

doctype_bp = Blueprint("doctype_bp", __name__)

@doctype_bp.route("/doctype", methods=["POST"])
@jwt_required()
def create_doctype():
    current_user_claims = get_jwt()
    data = request.get_json()
    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"msg": "Name is required"}), 400

    try:
        existing = db.get_doctype_by_name(data["name"].strip())
        if existing:
            return jsonify({"msg": "A document type with this name already exists."}), 400

        doctype_id = db.create_doctype(data)
        
        doctype = db.get_doctype_by_id(doctype_id)
        companies = data.get("companies", [])
        
        for company_id in companies:
            company = db.get_company_by_id(company_id)
            if company:
                create_company_doctype_folders(company["name"], doctype["name"])

        log_activity(
            actor=current_user_claims["username"],
            action="Create",
            resource_type="doctype",
            resource_data={
                "id": doctype_id,
                "name": data["name"].strip()
            }
        )

        return jsonify({
            "msg": "Document type created successfully",
            "doctype_id": doctype_id
        }), 201

    except Exception as e:
        return jsonify({"msg": f"Error creating document type: {str(e)}"}), 400

@doctype_bp.route("/doctype/<int:doctype_id>/companies", methods=["GET"])
@jwt_required()
def get_doctype_companies(doctype_id):
    try:
        companies = db.get_companies_by_datatype(doctype_id)
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route("/doctype/company/<int:company_id>", methods=["GET"])
@jwt_required()
def get_doctypes_by_company(company_id):
    try:
        doctypes = db.get_datatypes_by_company(company_id)
        return jsonify(doctypes), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route("/doctype", methods=["GET"])
@jwt_required()
def get_doctypes():
    try:
        doctypes = db.get_all_doctypes()
        result = []
        for doctype in doctypes:
            companies = db.get_companies_by_datatype(doctype["id"])
            doctype["companies"] = companies
            result.append(doctype)
        return jsonify({"doctypes": result}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route("/doctype/<int:doctype_id>", methods=["PUT"])
@jwt_required()
def update_doctype(doctype_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    existing = db.get_doctype_by_name_id(data["name"],doctype_id)
    if existing:
        return jsonify({"msg": "Datatype name already exists"}), 400
    try:
        companies = data.get("companies", None)
        if companies is not None and not isinstance(companies, list):
            return jsonify({"msg": "Companies must be a list of IDs"}), 400
        success = db.update_doctype(
            doctype_id=doctype_id,
            name=data.get("name"),
            status=data.get("status"),
            companies = companies
        )
        
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Update",
                resource_type="doctype",
                resource_data={
                    "id": doctype_id,
                    "name": data.get("name", "[unchanged]")
                }
            )
            return jsonify({"msg": "Document type updated successfully"}), 200
        else:
            return jsonify({"msg": "Document type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@doctype_bp.route("/doctype/<int:doctype_id>", methods=["DELETE"])
@jwt_required()
def delete_doctype(doctype_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403

    try:
        doctype = db.get_doctype_by_id(doctype_id)
        if not doctype:
            return jsonify({"msg": "Document type not found"}), 404
        
        success = db.delete_doctype(doctype_id)
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Delete",
                resource_type="doctype",
                resource_data={
                    "id": doctype_id,
                    "name": doctype["name"]
                }
            )
            return jsonify({"msg": "Document type deleted successfully"}), 200
        else:
            return jsonify({"msg": "Document type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500




