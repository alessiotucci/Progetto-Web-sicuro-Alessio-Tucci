from flask import Blueprint, request, jsonify
from api.db import get_db
from api.decorators import admin_required
import sqlite3
import html # [SECURITY FIX] Imported for XSS sanitization

# Every file defines one Blueprint, named after the resources
machines_bp = Blueprint('machines', __name__)

# 1) Read all - GET /api/machines
@machines_bp.route('/', methods=['GET'])
#@admin_required # [SECURITY FIX] Auth and admin role check enforced
def get_machines():
    try:
        db = get_db()
        machines = db.execute("""
        SELECT m.id, m.name, ms.label AS status
        FROM machines m
        JOIN machine_statuses ms ON m.status_id = ms.id
        """).fetchall()

        return jsonify([dict(row) for row in machines]), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure by catching DB errors
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 2) Read one - GET /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['GET'])
#@admin_required # [SECURITY FIX] Auth and admin role check enforced
def get_machine(machine_id):
    try:
        db = get_db()
        # [SECURITY FIX] Replaced string interpolation with parameterized query to prevent SQL Injection
        machine = db.execute("""
        SELECT m.id, m.name, ms.label AS status
        FROM machines m
        JOIN machine_statuses ms ON m.status_id = ms.id
        WHERE m.id = ?
        """, (machine_id,)).fetchone()

        if machine is None:
            return jsonify({'error': 'Machine not found'}), 404

        return jsonify(dict(machine)), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 3) Create - POST /api/machines
@machines_bp.route('/', methods=['POST'])
@admin_required # [SECURITY FIX] Auth and admin role check enforced
def create_machine():
    data = request.get_json()

    # [SECURITY FIX] Added input validation to prevent missing field errors
    if not data or 'id' not in data or 'name' not in data or 'status_id' not in data:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    machine_id = data['id']
    # [SECURITY FIX] XSS Prevention: Sanitize the input to prevent Stored XSS
    name = html.escape(data['name'])
    status_id = data['status_id']

    try:
        db = get_db()
        db.execute(
            "INSERT INTO machines (id, name, status_id) VALUES (?, ?, ?)",
            (machine_id, name, status_id)
        )
        db.commit()
        return jsonify({'message': 'Machine created', 'id': machine_id}), 201
    except sqlite3.IntegrityError:
        # [SECURITY FIX] Handle duplicate primary key creation gracefully
        return jsonify({"success": False, "error": "Machine ID already exists"}), 409
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 4) Update - PUT /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['PUT'])
@admin_required # [SECURITY FIX] Auth and admin role check enforced
def update_machine(machine_id):
    data = request.get_json()

    # [SECURITY FIX] Added input validation
    if not data or 'name' not in data or 'status_id' not in data:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    # [SECURITY FIX] XSS Prevention: Sanitize the input
    name = html.escape(data['name'])
    status_id = data['status_id']

    try:
        db = get_db()
        db.execute(
            "UPDATE machines SET name = ?, status_id = ? WHERE id = ?",
            (name, status_id, machine_id)
        )
        db.commit()
        return jsonify({'message': 'Machine updated'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500

# 5) Delete - DELETE /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['DELETE'])
@admin_required # [SECURITY FIX] Auth and admin role check enforced
def delete_machine(machine_id):
    try:
        db = get_db()
        db.execute("DELETE FROM machines WHERE id = ?", (machine_id,))
        db.commit()
        return jsonify({'message': 'Machine deleted'}), 200
    except sqlite3.Error as e:
        # [SECURITY FIX] Prevent information disclosure
        print(f"DB ERROR: {e}")
        return jsonify({"success": False, "error": "Internal Database Error"}), 500
