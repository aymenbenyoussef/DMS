
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from db import db
from app_utils import log_activity

partner_bp = Blueprint("partner_bp", __name__)

@partner_bp.route("/partnertype", methods=["GET"])
@jwt_required()
def get_partnertypes():
    try:
        partners = db.get_all_partner_types()
        return jsonify(partners), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@partner_bp.route("/partnertype", methods=["POST"])
@jwt_required()
def create_partner_type():
    current_user_claims = get_jwt()
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"msg": "Partner type name is required"}), 400
    
    if db.check_partner_type_name_exists(data["name"].strip()):
        return jsonify({"msg": "A partner type with this name already exists"}), 400
    try:
        partner_type_id = db.create_partner_type(
            name=data["name"].strip(),
            status=data.get("status", True)
        )
        log_activity(
            actor=current_user_claims["username"],
            action="Create",
            resource_type="partnertype",
            resource_data={
                "id": partner_type_id,
                "name": data["name"].strip(),
                "status": data.get("status", True)
            }
        )
        return jsonify({
            "msg": "Partner type created successfully",
            "partner_type_id": partner_type_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@partner_bp.route("/partnertype/<int:partner_type_id>", methods=["PUT"])
@jwt_required()
def update_partner_type(partner_type_id):
    current_user_claims = get_jwt()
    data = request.get_json()
    
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    if "name" in data and data["name"]:
        if db.check_partner_type_name_exists_except_id(data["name"].strip(), partner_type_id):
            return jsonify({"msg": "A partner type with this name already exists"}), 400
    
    try:
        success = db.update_partner_type(
            partner_type_id=partner_type_id,
            name=data.get("name").strip() if data.get("name") else None,
            status=data.get("status")
        )
        
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Update",
                resource_type="partnertype",
                resource_data={
                    "id": partner_type_id,
                    "name": data.get("name"),
                    "status": data.get("status")
                }
            )
            return jsonify({"msg": "Partner type updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@partner_bp.route("/partnertype/<int:partner_type_id>/status", methods=["PUT"])
@jwt_required()
def update_partner_type_status(partner_type_id):
    data = request.get_json()
    
    if not data or "status" not in data:
        return jsonify({"msg": "Status is required"}), 400
    
    try:
        success = db.update_partner_type_status(partner_type_id, data["status"])
        
        if success:
            return jsonify({"msg": "Partner type status updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@partner_bp.route("/partnertype/<int:partner_type_id>", methods=["DELETE"])
@jwt_required()
def delete_partner_type(partner_type_id):
    current_user_claims = get_jwt()
    
    try:
        partner_type = db.get_partner_type_by_id(partner_type_id)
        if not partner_type:
            return jsonify({"msg": "Partner type not found"}), 404
        
        success = db.delete_partner_type(partner_type_id)
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Delete",
                resource_type="partnertype",
                resource_data={
                    "id": partner_type_id,
                    "name": partner_type["name"],
                    "status": partner_type["status"]
                }
            )
            return jsonify({"msg": "Partner type deleted successfully"}), 200
        else:
            return jsonify({"msg": "Partner type not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@partner_bp.route("/partners", methods=["POST"])
@jwt_required()
def create_partner():
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    try:
        if db.check_partner_exists(data):
            if db.check_partner_field_exists("company_name", data.get("company_name")):
                return jsonify({"msg": "Un partenaire avec ce nom d'entreprise existe déjà"}), 400
            if db.check_partner_field_exists("unique_identifier", data.get("unique_identifier")):
                return jsonify({"msg": "Un partenaire avec cet identifiant unique existe déjà"}), 400
            if db.check_partner_field_exists("email", data.get("email")):
                return jsonify({"msg": "Un partenaire avec cet e-mail existe déjà"}), 400
            if db.check_partner_field_exists("phone1", data.get("phone1")):
                return jsonify({"msg": "Un partenaire avec ce numéro de téléphone principal existe déjà"}), 400
            if db.check_partner_field_exists("mailing_address", data.get("mailing_address")):
                return jsonify({"msg": "Un partenaire avec cette adresse postale existe déjà"}), 400
            if db.check_partner_field_exists("bank_account_number", data.get("bank_account_number")):
                return jsonify({"msg": "Un partenaire avec ce numéro de compte bancaire existe déjà"}), 400
            return jsonify({"msg": "Un partenaire avec des champs uniques similaires existe déjà"}), 400
        
        for field in ["trade_name", "billing_address", "phone2", "phone3", 
                    "payment_terms", "billing_terms", "bank_account_number", 
                    "bank_name", "notes"]:
            if field in data and data[field] == "":
                data[field] = None
        
        partner_id = db.create_partner(data)
        partner = db.get_partner_by_id(partner_id)
        
        log_activity(
            actor=current_user_claims["username"],
            action="Create",
            resource_type="partner",
            resource_data={
                "id": partner_id,
                "company_name": partner["company_name"],
                "partner_type": ", ".join([pt["name"] for pt in partner.get("partnertypes", [])]) if partner.get("partnertypes") else "N/A",
                "status": partner.get("is_active", True)
            }
        )
        return jsonify({
            "msg": "Partner created successfully",
            "partner_id": partner_id
        }), 201
        
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@partner_bp.route("/partners/<int:partner_id>", methods=["PUT"])
@jwt_required()
def update_partner(partner_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    
    try:
        if db.check_partner_exists(data, exclude_id=partner_id):
            if db.check_partner_field_exists("company_name", data.get("company_name"), exclude_id=partner_id):
                return jsonify({"msg": "Un autre partenaire avec ce nom d'entreprise existe déjà"}), 400
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
            return jsonify({"msg": "Un autre partenaire avec des champs uniques similaires existe déjà"}), 400
        
        for field in ["trade_name", "billing_address", "phone2", "phone3", 
                    "payment_terms", "billing_terms", "bank_account_number", 
                    "bank_name", "notes"]:
            if field in data and data[field] == "":
                data[field] = None
        
        success = db.update_partner(partner_id, data)
        
        if success:
            partner = db.get_partner_by_id(partner_id)
            if not partner:
                return jsonify({"msg": "Partner not found"}), 404
            log_activity(
                actor=current_user_claims["username"],
                action="Update",
                resource_type="partner",
                resource_data={
                    "id": partner_id,
                    "company_name": partner["company_name"],
                    "partner_type": ", ".join([pt["name"] for pt in partner.get("partnertypes", [])]) 
                           if partner.get("partnertypes") else "N/A",
                    "status": partner.get("is_active", True)
                }
            )
            return jsonify({"msg": "Partner updated successfully"}), 200
        else:
            return jsonify({"msg": "Partner not found"}), 404
            
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@partner_bp.route("/partners/<int:partner_id>", methods=["DELETE"])
@jwt_required()
def delete_partner(partner_id):
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        partner = db.get_partner_by_id(partner_id)
        if not partner:
            return jsonify({"msg": "Partner not found"}), 404
        
        success = db.delete_partner(partner_id)
        if success:
            log_activity(
                actor=current_user_claims["username"],
                action="Delete",
                resource_type="partner",
                resource_data={
                    "id": partner_id,
                    "company_name": partner["company_name"],
                    "partner_type": ", ".join([pt["name"] for pt in partner.get("partnertypes", [])]) if partner.get("partnertypes") else "N/A",
                    "status": False
                }
            )
            return jsonify({"msg": "Partner deleted successfully"}), 200
        else:
            return jsonify({"msg": "Partner not found"}), 404
            
    except Exception as e:
        # app.logger.error(f"Error deleting partner {partner_id}: {str(e)}") # app not available here
        return jsonify({"msg": f"Error deleting partner: {str(e)}"}), 500

@partner_bp.route("/partners/<int:partner_id>", methods=["GET"])
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

@partner_bp.route("/partners/<int:partner_id>/companies", methods=["GET"])
@jwt_required()
def get_companies_by_partner(partner_id):
    try:
        companies = db.get_companies_by_partner_id(partner_id)
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@partner_bp.route("/partners/<int:partner_id>/partnertypes", methods=["GET"])
@jwt_required()
def get_partnertypes_by_partner(partner_id):
    try:
        partnertypes = db.get_partnertypes_by_partner_id(partner_id)
        return jsonify(partnertypes), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@partner_bp.route("/partners", methods=["GET"])
@jwt_required()
def get_partners():
    try:
        partners = db.get_all_partners()
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

@partner_bp.route("/partners/check-field", methods=["POST"])
@jwt_required()
def check_partner_field():
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data or "field_name" not in data or "field_value" not in data:
        return jsonify({"msg": "field_name and field_value are required"}), 400
    
    field_name = data["field_name"]
    field_value = data["field_value"]
    exclude_id = data.get("exclude_id")
    
    allowed_fields = ["company_name", "unique_identifier", "email", "phone1", "mailing_address", "bank_account_number"]
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

@partner_bp.route("/partners/check-multiple-fields", methods=["POST"])
@jwt_required()
def check_multiple_partner_fields():
    current_user_claims = get_jwt()
    if current_user_claims.get("role") != "admin":
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data or "fields" not in data:
        return jsonify({"msg": "fields object is required"}), 400
    
    fields = data["fields"]
    exclude_id = data.get("exclude_id")
    
    conflicts = {}
    allowed_fields = ["company_name", "unique_identifier", "email", "phone1", "mailing_address", "bank_account_number"]
    
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


