from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, create_access_token
from db import db
from datetime import timedelta
import os
from app_utils import log_activity, ensure_log_dir, ACTIVITY_LOG

user_admin_bp = Blueprint('user_admin_bp', __name__)

# JWT Configuration (can be moved to app.py if shared)
# user_admin_bp.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=4)
# user_admin_bp.config['JWT_SECRET_KEY'] = 'dms-secret-key-2025'

@user_admin_bp.route('/register', methods=['POST'])
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

@user_admin_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"msg": "Missing email or password"}), 400

    user = db.get_user_by_email(data["email"])
    if not user or not db.verify_password(user["password_hash"], data["password"]):
        return jsonify({"msg": "Invalid credentials"}), 401

    if not user["is_active"]:
        return jsonify({"msg": "Account is deactivated"}), 401

    access_token = create_access_token(identity=user["email"], additional_claims={
        "id": user["id"],
        "role": user["role"],
        "username": user["username"],
        "email": user["email"]
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
        # app.logger.error(f"Error reading log file: {str(e)}") # app not available here
        return []

@user_admin_bp.route('/admin/activity_logs', methods=['GET'])
@jwt_required()
def get_activity_logs_endpoint():
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        # app.logger.warning("Unauthorized access attempt to logs from user: %s", current_user_claims.get('username'))
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        logs = read_activity_logs()
        # app.logger.info("Returning %d log entries to user: %s", len(logs), current_user_claims.get('username'))
        return jsonify({"logs": logs}), 200
    except Exception as e:
        # app.logger.error("Error fetching logs: %s", str(e), exc_info=True)
        return jsonify({"msg": f"Error fetching logs: {str(e)}"}), 500

@user_admin_bp.route('/admin/users', methods=['GET'])
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

@user_admin_bp.route('/admin/users', methods=['POST'])
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

@user_admin_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400
    existing = db.get_user_by_email_except_id(data['email'],user_id)
    if existing:
        return jsonify({"msg": "A user with this email already exists"}), 400
    try:
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

@user_admin_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({"msg": "User not found"}), 404
        
        success = db.delete_user(user_id)
        if success:
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


