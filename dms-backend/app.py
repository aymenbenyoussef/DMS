# backend/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)
from db import db

app = Flask(__name__)
CORS(app)

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

    try:
        user_id = db.create_user(
            username=data['username'],
            password=data['password'],
            role=data.get('role', 'user'),
            is_active=data.get('is_active', True),
            user_limit=data.get('user_limit', 0)
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

    try:
        success = db.update_user(
            user_id=user_id,
            username=data.get('username'),
            password=data.get('password') if data.get('password') else None,
            role=data.get('role'),
            is_active=data.get('is_active'),
            user_limit=data.get('user_limit')
        )
        if success:
            return jsonify({"msg": "User updated successfully"}), 200
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user_claims = get_jwt()
    if current_user_claims.get('role') != 'admin':
        return jsonify({"msg": "Admin access required"}), 403
    
    try:
        success = db.delete_user(user_id)
        if success:
            return jsonify({"msg": "User deleted successfully"}), 200
        else:
            return jsonify({"msg": "User not found"}), 404
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

# Company management routes
@app.route('/companies', methods=['GET'])
@jwt_required()
def get_companies():
    current_user = get_jwt_identity()
    try:
        companies = db.get_user_companies(current_user['id'])
        return jsonify(companies), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/companies', methods=['POST'])
@jwt_required()
def create_company():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({"msg": "Company name is required"}), 400

    try:
        company_id = db.create_company(data['name'])
        # Associate user with the company
        db.add_user_to_company(current_user['id'], company_id)
        return jsonify({
            "msg": "Company created successfully",
            "company_id": company_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

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
    current_user = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ['company_id', 'filename', 'document_type']
    if not data or not all(field in data for field in required_fields):
        return jsonify({"msg": "Missing required fields"}), 400

    if data['document_type'] not in ['invoice', 'non_invoice']:
        return jsonify({"msg": "Invalid document type"}), 400

    try:
        document_id = db.create_document(
            owner_id=current_user['id'],
            company_id=data['company_id'],
            filename=data['filename'],
            document_type=data['document_type']
        )
        
        # Add to history
        db.add_document_history(document_id, current_user['id'], 'Document created')
        
        return jsonify({
            "msg": "Document created successfully",
            "document_id": document_id
        }), 201
    except Exception as e:
        return jsonify({"msg": str(e)}), 400

@app.route('/documents/<int:document_id>/history', methods=['GET'])
@jwt_required()
def get_document_history(document_id):
    try:
        history = db.get_document_history(document_id)
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

# Folder management routes
@app.route('/folders', methods=['GET'])
@jwt_required()
def get_folders():
    company_id = request.args.get('company_id')
    parent_id = request.args.get('parent_id')
    
    if not company_id:
        return jsonify({"msg": "Company ID is required"}), 400

    try:
        folders = db.get_folders_by_company(
            company_id, 
            parent_id=int(parent_id) if parent_id else None
        )
        return jsonify(folders), 200
    except Exception as e:
        return jsonify({"msg": str(e)}), 500

@app.route('/folders', methods=['POST'])
@jwt_required()
def create_folder():
    current_user = get_jwt_identity()
    data = request.get_json()
    
    required_fields = ['name', 'company_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({"msg": "Missing required fields"}), 400

    try:
        folder_id = db.create_folder(
            name=data['name'],
            created_by=current_user['id'],
            company_id=data['company_id'],
            parent_id=data.get('parent_id')
        )
        return jsonify({
            "msg": "Folder created successfully",
            "folder_id": folder_id
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
    app.run(host='0.0.0.0', debug=True)