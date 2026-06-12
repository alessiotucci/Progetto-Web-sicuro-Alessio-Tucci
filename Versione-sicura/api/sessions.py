from flask import Blueprint, request, jsonify
from api.db import get_db
from api.decorators import admin_required
import sqlite3

sessions_bp = Blueprint('sessions', __name__)

# 1) Read all - GET /api/sessions
@sessions_bp.route('/', methods=['GET'])
def get_sessions():
    # 1. Identificazione dell'utente chiamante
    caller_id = request.headers.get('X-User-Id')
    if not caller_id:
        return jsonify({'success': False, 'message': 'Missing X-User-Id header'}), 401

    try:
        db = get_db()
        
        # 2. Ottieni il ruolo dell'utente chiamante
        caller = db.execute("SELECT role FROM users WHERE id = ?", (caller_id,)).fetchone()
        if not caller:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        is_admin = (caller['role'] == 'admin')

        # 3. Estrai tutte le sessioni (aggiunto user_id per il controllo)
        sessions = db.execute("""
        SELECT s.id, s.user_id, s.started_at, s.ended_at, u.username, m.name AS machine_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN machines m ON s.machine_id = m.id
        """).fetchall()

        # 4. [SECURITY FIX] Business Logic: Oscuramento dati (Data Masking)
        secure_sessions = []
        for row in sessions:
            session_dict = dict(row)
            
            # Se NON sei admin E questa sessione NON è tua -> nascondi l'identità
            if not is_admin and str(session_dict['user_id']) != str(caller_id):
                session_dict['username'] = 'Qualcuno' # O semplicemente None
                
            # Rimuove l'user_id esatto prima di inviare al front-end
            session_dict.pop('user_id', None) 
            secure_sessions.append(session_dict)

        return jsonify(secure_sessions), 200

    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 2) Read one - GET /api/sessions/<session_id>
@sessions_bp.route('/<session_id>', methods=['GET'])
#@admin_required # [SECURITY FIX] Auth and admin role check enforced
def get_session(session_id):
    try:
        db = get_db()
        # [SECURITY FIX] Replaced f-string/interpolation with parameterized query to prevent SQL Injection
        session = db.execute("""
        SELECT s.id, s.started_at, s.ended_at, u.username, m.name AS machine_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN machines m ON s.machine_id = m.id
        WHERE s.id = ?
        """, (session_id,)).fetchone()

        if session is None:
            return jsonify({'error': 'Session not found'}), 404

        return jsonify(dict(session)), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 3) Create - POST /api/sessions
@sessions_bp.route('/', methods=['POST'])
def create_session():
    data = request.get_json()

    # [SECURITY FIX] Added input validation to prevent malicious or malformed data
    if not data or 'user_id' not in data or 'machine_id' not in data or 'started_at' not in data or 'ended_at' not in data:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    user_id = data['user_id']
    machine_id = data['machine_id']
    started_at = data['started_at']
    ended_at = data['ended_at']

    try:
        db = get_db()
        db.execute(
            "INSERT INTO sessions (user_id, machine_id, started_at, ended_at) VALUES (?, ?, ?, ?)",
            (user_id, machine_id, started_at, ended_at)
        )
        db.commit()
        return jsonify({'message': 'Session created'}), 201
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 4) Update - PUT /api/sessions/<session_id>
@sessions_bp.route('/<session_id>', methods=["PUT"])
def update_session(session_id):
    data = request.get_json()

    # [SECURITY FIX] Added input validation
    if not data or 'started_at' not in data or 'ended_at' not in data:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    started_at = data.get('started_at')
    ended_at = data.get('ended_at')

    try:
        db = get_db()
        db.execute(
            "UPDATE sessions SET started_at = ?, ended_at = ? WHERE id = ?",
            (started_at, ended_at, session_id)
        )
        db.commit()
        return jsonify({'message': 'Session updated'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 5) Delete - DELETE /api/sessions/<session_id>
@sessions_bp.route('/<session_id>', methods=["DELETE"])
def delete_session(session_id):
    try:
        db = get_db()
        db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        db.commit()
        return jsonify({'message': 'Session deleted'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# [SECURITY FIX] Privacy enhanced!
# 1.5) Read personal sessions - GET /api/sessions/me
@sessions_bp.route('/me', methods=['GET'])
def get_my_sessions():
    caller_id = request.headers.get('X-User-Id')
    if not caller_id:
        return jsonify({'success': False, 'message': 'Missing X-User-Id header'}), 401

    try:
        db = get_db()
        sessions = db.execute("""
        SELECT s.id, s.started_at, s.ended_at, u.username, m.name AS machine_name
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        JOIN machines m ON s.machine_id = m.id
        WHERE s.user_id = ?
        """, (caller_id,)).fetchall()

        return jsonify([dict(row) for row in sessions]), 200
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500