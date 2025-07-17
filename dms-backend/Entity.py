from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from app_utils import log_activity, DMS_UPLOAD_FOLDER, os

entity_bp = Blueprint("entity_bp", __name__)

@entity_bp.route("/companies", methods=["POST"])
@jwt_required()
def create_company():
    current_user_claims = get_jwt()
    data = request.get_json()

    if not data or "name" not in data or not data["name"].strip():
        return jsonify({"msg": "Company name is required"}), 400
    
    conflicts = db.check_company_exist(
        data.get("name").strip(),
        data.get("email", "").strip()
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
            company_folder = os.path.join(DMS_UPLOAD_FOLDER, str(company_id))
            os.makedirs(company_folder, exist_ok=True)
        
        log_activity(
            actor=current_user_claims["username"],
            action="Create",
            resource_type="company",
            resource_data={
                "id": company_id,
                "name": data.get("name")
            }
        )
          
        return jsonify({
            "msg": "Company created successfully",
            "company_id": company_id
        }), 201
    except Exception as e:
        return jsonify({"msg": f"Error creating company: {str(e)}"}), 400
    
@entity_bp.route("/companies/<int:company_id>", methods=["PUT"])
@jwt_required()
def update_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"msg": "Missing company data"}), 400
    
    conflicts = db.check_company_exist_id(
    data.get("name").strip(),
    data.get("email", "").strip(),
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
            name=data.get("name"),
            address=data.get("address"),
            email=data.get("email"),
            phone=data.get("phone")
        )
        
        company = db.get_company_by_id(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404
            
        log_activity(
            actor=current_user_claims["username"],
            action="Update",
            resource_type="company",
            resource_data={
                "id": company_id,
                "name": company["name"]
            }
        )
        
        return jsonify({"msg": "Company updated successfully"}), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@entity_bp.route("/companies/<int:company_id>", methods=["DELETE"])
@jwt_required()
def delete_company(company_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        company = db.get_company_by_id(company_id)
        if not company:
            return jsonify({"msg": "Company not found"}), 404
        
        success = db.delete_company(company_id)
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Delete",
                resource_type="company",
                resource_data={
                    "id": company_id,
                    "name": company["name"]
                }
            )
            
            return jsonify({"msg": "Company deleted successfully"}), 200
        else:
            return jsonify({"msg": "Company not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@entity_bp.route("/companies", methods=["GET"])
@jwt_required()
def get_companies():
    try:
        claims = get_jwt()
        current_user_id = claims.get("id")
        user_role = claims.get("role", "user")

        if not current_user_id:
            return jsonify({"error": "User ID not found in token"}), 400

        if user_role == "admin":
            companies = db.get_all_companies()
        else:
            companies = db.get_user_companies(current_user_id)

        return jsonify({"companies": companies}), 200  # Wrap in consistent structure

    except Exception as e:
        print(f"Error in /companies: {str(e)}")  # Add logging
        return jsonify({"error": str(e)}), 500
    
@entity_bp.route("/companies/<int:user_id>", methods=["get"])
def get_companies_by_user(user_id):
    try:
        companies = db.get_user_companies(user_id)
        return jsonify(companies), 200
    except Exception as e:
        # app.logger.error(f"Error in /companies: {str(e)}") # app not available here
        return jsonify({"error": "Internal server error"}), 500




