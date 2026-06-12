from flask import Blueprint, request, jsonify
from api.db import get_db

users_bp = Blueprint('users', __name__)

# 1) Read all - GET /api/users
@users_bp.route('/', methods=['GET'])
def get_users():
    db = get_db()
    #TODO: no auth service, no check admin role, not cleaning input
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
    WHERE u.id = '%s'
    """ % user_id).fetchone()

    if user is None:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(dict(user)), 200

# 3) Create - POST /api/users
@users_bp.route('/', methods=['POST'])
def create_user():
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaning input
    username = data['username']
    password = data['password']
    role = 'user' #role = data['role']

    cursor = db.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, password, role)
            )
    user_id = cursor.lastrowid
    db.commit()

    return jsonify({'message': 'User created', 'id': user_id}), 201

# 4) Update - PUT /api/users/<user_id>
@users_bp.route('/<user_id>', methods=['PUT'])
def update_users(user_id):
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaning input
#    username = data['username']
#    password = data['password']
#
#    db.execute(
#            "UPDATE users SET username = ?, password = ? WHERE id = ?",
#            (username, password, user_id)
#            )

    role = data['role']
    db.execute(
            "UPDATE users SET role = ? WHERE id = ?",
            (role, user_id)
            )

    db.commit()

    return jsonify({'message': 'User updated'}), 200

# 5) Delete - DELETE /api/users/<user_id>
@users_bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    db = get_db()

    #TODO: no auth service, no check admin, no cleaning input
    db.execute("DELETE FROM users WHERE id = ?", (user_id,))
    db.commit()

    return jsonify({'message': 'User deleted!'}), 200
