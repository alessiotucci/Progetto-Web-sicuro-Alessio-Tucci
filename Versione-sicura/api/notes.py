from flask import Blueprint, request, jsonify
from api.db import get_db
from api.decorators import admin_required
import sqlite3
import html # [SECURITY FIX] Imported for XSS sanitization

notes_bp = Blueprint('notes', __name__)

# 1) Read all - GET /api/notes
@notes_bp.route('/', methods=['GET'])
@admin_required # [SECURITY FIX] Auth and admin role check enforced
def get_notes():
    try:
        db = get_db()
        notes = db.execute("""
        SELECT n.id, n.content, n.created_at, u.username, m.name
        FROM notes n
        JOIN users u ON n.user_id = u.id
        JOIN machines m ON n.machine_id = m.id
        """).fetchall()

        return jsonify([dict(row) for row in notes]), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure by catching DB errors
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 2) Read one - GET /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['GET'])
@admin_required # [SECURITY FIX] Auth and admin role check enforced
def get_note(note_id):
    try:
        db = get_db()
        # [SECURITY FIX] Replaced f-string/interpolation with parameterized query to prevent SQL Injection
        note = db.execute("""
        SELECT n.id, n.content, n.created_at, u.username, m.name
        FROM notes n
        JOIN users u ON n.user_id = u.id
        JOIN machines m ON n.machine_id = m.id
        WHERE n.id = ?
        """, (note_id,)).fetchone()

        if note is None:
            return jsonify({'error': 'Note not found'}), 404

        return jsonify(dict(note)), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 3) Create - POST /api/notes
@notes_bp.route('/', methods=['POST'])
def create_note():
    data = request.get_json()

    # [SECURITY FIX] Added input validation to prevent malicious or malformed data
    if not data or not data.get('user_id') or not data.get('machine_id') or not data.get('content'):
        return jsonify({'error': 'Missing required fields'}), 400

    user_id = data.get('user_id')
    machine_id = data.get('machine_id')
    
    # [SECURITY FIX] XSS Prevention: Sanitize the input to neutralize HTML/JavaScript execution 
    # before storing it in the database (Stored XSS mitigation).
    content = html.escape(data.get('content'))

    try:
        db = get_db()
        cursor = db.execute(
            "INSERT INTO notes (user_id, machine_id, content) VALUES (?, ?, ?)",
            (user_id, machine_id, content)
        )
        db.commit()
        
        note_id = cursor.lastrowid
        return jsonify({'message': 'Note created', 'id': note_id}), 201
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 4) Update - PUT /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.get_json()

    # [SECURITY FIX] Added input validation
    if not data or not data.get('content'):
        return jsonify({'error': 'Missing required fields'}), 400

    # [SECURITY FIX] XSS Prevention: Sanitize the input to prevent Stored XSS attacks
    content = html.escape(data.get('content'))

    try:
        db = get_db()
        db.execute(
            "UPDATE notes SET content = ? WHERE id = ?",
            (content, note_id)
        )
        db.commit()
        return jsonify({'message': 'Note updated'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 5) Delete - DELETE /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        db = get_db()
        db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        db.commit()
        return jsonify({'message': 'Note deleted'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# [SECURITY FIX] Privacy enhanced!
# 1.5) Read personal notes - GET /api/notes/me
@notes_bp.route('/me', methods=['GET'])
def get_my_notes():
    caller_id = request.headers.get('X-User-Id')
    if not caller_id:
        return jsonify({'success': False, 'message': 'Missing X-User-Id header'}), 401

    try:
        db = get_db()
        notes = db.execute("""
        SELECT n.id, n.content, n.created_at, u.username, m.name
        FROM notes n
        JOIN users u ON n.user_id = u.id
        JOIN machines m ON n.machine_id = m.id
        WHERE n.user_id = ?
        """, (caller_id,)).fetchall()

        return jsonify([dict(row) for row in notes]), 200
    except sqlite3.Error as e:
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500
    
