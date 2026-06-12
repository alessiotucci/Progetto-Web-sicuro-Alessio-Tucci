from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from api.db import get_db
import sqlite3

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    # Estrae i dati JSON inviati dal front-end
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"success": False, "message": "Missing Fields"}), 400

    username = data['username']
    password = data['password']

    try:
        conn = get_db()
        cursor = conn.cursor()
        query = "SELECT id, username, role, password FROM users WHERE username = ?"
        cursor.execute(query, (username,))
        user = cursor.fetchone() # Prende il primo record che soddisfa la condizione
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "message": "Internal Database error"}), 500
    # Verifica se la query ha prodotto un risultato
    if user and check_password_hash(user[3], password):
        return jsonify({
            "success": True,
            "user": {
                "id": user[0],
                "username": user[1],
                "role": user[2]
            }
        }), 200
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401
