from functools import wraps
from flask import request, jsonify
from api.db import get_db
import sqlite3

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Estrae l'ID utente dall'header della richiesta
        user_id = request.headers.get('X-User-Id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'Authentication required (Missing X-User-Id header)'}), 401

        try:
            db = get_db()
            user = db.execute("SELECT role FROM users WHERE id = ?", (user_id,)).fetchone()
            
            if user is None:
                return jsonify({'success': False, 'message': 'User not found'}), 404
                
            if user['role'] != 'admin':
                return jsonify({'success': False, 'message': 'Admin privileges required'}), 403
                
        except sqlite3.Error as e:
            print(f"DB ERROR in admin check: {e}")
            return jsonify({"success": False, "error": "Internal Database Error"}), 500

        # Se i controlli passano, esegue la funzione originale (la route API)
        return f(*args, **kwargs)
        
    return decorated_function
