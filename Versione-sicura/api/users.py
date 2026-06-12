from flask import Blueprint, request, jsonify
from api.db import get_db
from werkzeug.security import generate_password_hash
from api.decorators import admin_required
import sqlite3

users_bp = Blueprint('users', __name__)

# 1) Read all - GET /api/users (Admin Only)
@users_bp.route('/', methods=['GET'])
@admin_required
def get_users():
    db = get_db()
    users = db.execute("""
    SELECT username, role, id
    FROM users
    """).fetchall()

    return jsonify([dict(row) for row in users]), 200

# 2) Read one - GET /api/users/<user_id>
@users_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    db = get_db()
    user = db.execute("""
    SELECT u.username, u.role
    FROM users u
    WHERE u.id = ?
    """, (user_id,)).fetchone()

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(dict(user)), 200

# 3) Create - POST /api/users
@users_bp.route('/', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"success": False, "message": "Campi mancanti"}), 400

    username = data['username']
    password = data['password']

    hashed_password = generate_password_hash(password)
    try:
        conn = get_db()
        cursor = conn.cursor()
        query = "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')"
        cursor.execute(query, (username, hashed_password))
        user_id = cursor.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "error": "Username already exists"}), 409
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

    return jsonify({
        "success": True,
        "user": {
            "id": user_id,
            "username": username,
            "role": "user"
        }
    }), 201

# 4) Update - PUT /api/users/<user_id> (Admin Only)
@users_bp.route('/<user_id>', methods=['PUT'])
@admin_required
def update_users(user_id):
    db = get_db()
    data = request.get_json()

    if not data or 'role' not in data:
        return jsonify({"success": False, "message": "Missing role field"}), 400

    role = data['role']
    
    try:
        db.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            (role, user_id)
        )
        db.commit()
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

    return jsonify({'message': 'User updated'}), 200

# 5) Delete - DELETE /api/users/<user_id> (Admin Only)
@users_bp.route('/<user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    db = get_db()
    try:
        db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        db.commit()
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500
        
    return jsonify({'message': 'User deleted!'}), 200