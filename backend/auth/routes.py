from flask import Blueprint, request, jsonify
from database import DatabaseManager
from auth.utils import hash_password, check_password, generate_token, token_required

auth_bp = Blueprint('auth', __name__)
db = DatabaseManager()

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'Analyst') # Defaults to Analyst if not specified
    
    if not username or not email or not password:
        return jsonify({'message': 'Username, email, and password are required'}), 400
        
    if role not in ['Admin', 'Analyst', 'Guest']:
        return jsonify({'message': 'Invalid role specified. Supported: Admin, Analyst, Guest'}), 400
        
    p_hash = hash_password(password)
    
    try:
        user_id = db.create_user(username, email, p_hash, role)
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id
        }), 201
    except ValueError as e:
        return jsonify({'message': str(e)}), 409
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'message': 'Username and password are required'}), 400
        
    try:
        user = db.get_user_by_username(username)
        if not user:
            return jsonify({'message': 'Invalid username or password'}), 401
            
        # user tuple: (id, username, email, password_hash, role, created_at)
        user_id, uname, email, p_hash, role, created_at = user
        
        if not check_password(p_hash, password):
            return jsonify({'message': 'Invalid username or password'}), 401
            
        # Generate token
        token = generate_token(user_id, role)
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user_id,
                'username': uname,
                'email': email,
                'role': role
            }
        }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['GET'])
@token_required()
def get_profile():
    user_id = request.user['user_id']
    try:
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        user_id, uname, email, _, role, created_at = user
        return jsonify({
            'id': user_id,
            'username': uname,
            'email': email,
            'role': role,
            'created_at': created_at
        }), 200
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@token_required()
def update_profile():
    user_id = request.user['user_id']
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    
    if not username or not email:
        return jsonify({'message': 'Username and email are required'}), 400
        
    try:
        db.update_user_profile(user_id, username, email)
        return jsonify({'message': 'Profile updated successfully'}), 200
    except ValueError as e:
        return jsonify({'message': str(e)}), 409
    except Exception as e:
        return jsonify({'message': f'Server error: {str(e)}'}), 500
