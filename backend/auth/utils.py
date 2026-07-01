import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import config

# Use Werkzeug's secure built-in hashing utilities
def hash_password(password):
    return generate_password_hash(password)

def check_password(p_hash, password):
    return check_password_hash(p_hash, password)

# Generate JWT Token (valid for 24 hours)
def generate_token(user_id, role, username=""):
    try:
        payload = {
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1),
            'iat': datetime.datetime.utcnow(),
            'sub': str(user_id),
            'role': role,
            'username': username
        }
        return jwt.encode(
            payload,
            config.JWT_SECRET_KEY,
            algorithm='HS256'
        )
    except Exception as e:
        return str(e)

# Decode & Validate JWT Token
def decode_token(token):
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
        return {
            'user_id': int(payload['sub']),
            'role': payload['role'],
            'username': payload.get('username', '')
        }
    except jwt.ExpiredSignatureError:
        return 'Signature expired. Please log in again.'
    except jwt.InvalidTokenError:
        return 'Invalid token. Please log in again.'

# Protected route decorator with optional Role-Based Access Control (RBAC)
def token_required(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # Check for API Key first
            if 'X-API-Key' in request.headers:
                api_key = request.headers['X-API-Key']
                from database import DatabaseManager
                db = DatabaseManager()
                key_details = db.get_api_key_by_value(api_key)
                if key_details:
                    role = key_details['role']
                    if allowed_roles and role not in allowed_roles:
                        return jsonify({'message': f'Access denied: {role} role does not have permission'}), 403
                    request.user = {
                        'user_id': 0,
                        'role': role,
                        'username': f"API Key ({key_details['name']})"
                    }
                    return f(*args, **kwargs)
                else:
                    return jsonify({'message': 'Invalid API Key'}), 401

            token = None
            # Look for Authorization header or query param
            if 'Authorization' in request.headers:
                auth_header = request.headers['Authorization']
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(" ")[1]
            elif 'token' in request.args:
                token = request.args.get('token')
            
            if not token:
                return jsonify({'message': 'Access token or API Key is missing'}), 401
            
            decoded = decode_token(token)
            
            # If decode returns a string, it is an error message
            if isinstance(decoded, str):
                return jsonify({'message': decoded}), 401
            
            # Check user role if roles are specified
            if allowed_roles and decoded['role'] not in allowed_roles:
                return jsonify({
                    'message': f'Access denied: {decoded["role"]} role does not have permission'
                }), 403
                
            # Inject user information into route
            request.user = decoded
            return f(*args, **kwargs)
        return decorated
    return decorator
