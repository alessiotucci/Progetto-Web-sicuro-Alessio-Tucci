from flask import Blueprint, request, jsonify
from api.db import get_db

# Every file defines one Blueprint, named after the resources
machines_bp = Blueprint('machines', __name__)

# 1) Read all - GET /api/machines
@machines_bp.route('/', methods=['GET'])
def get_machines():
    db = get_db()
    #TODO: no auth service, no check admin role, not cleaning input
    machines = db.execute("""
    SELECT m.id, m.name, ms.label AS status
    FROM machines m
    JOIN machine_statuses ms ON m.status_id = ms.id
    """).fetchall()

    return jsonify([dict(row) for row in machines]), 200

# 2) Read one - GET /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['GET'])
def get_machine(machine_id):
    db = get_db()
    #TODO: no auth service, no check admin role, no cleaning input
    machine = db.execute("""
    SELECT m.id, m.name, ms.label AS status
    FROM machines m
    JOIN machine_statuses ms ON m.status_id = ms.id
    WHERE m.id = '%s'
    """ % machine_id).fetchone()

    if machine is None:
        return jsonify({'error': 'Machine not found'}), 404

    return jsonify(dict(machine)), 200

# 3) Create - POST /api/machines
@machines_bp.route('/', methods=['POST'])
def create_machine():
    db = get_db()
    data = request.get_json()

    #TODO: no auth serice no check admin role, no cleaning input
    machine_id = data['id']
    name = data['name']
    status_id = data['status_id']

    db.execute(
            "INSERT INTO machines (id, name, status_id) VALUES (?, ?, ?)",
            (machine_id, name, status_id)
        )
    db.commit()

    return jsonify({'message': 'Machine created', 'id': machine_id}), 201

# 4) Update - PUT /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['PUT'])
def update_machine(machine_id):
    db = get_db()
    data = request.get_json()

    #TODO: no aut service, no check admin role, no cleaning input
    name = data.get('name')
    status_id = data.get('status_id')

    db.execute(
            "UPDATE machines SET name = ?, status_id = ? WHERE id = ?",
            (name, status_id, machine_id)
        )
    db.commit()

    return jsonify({'message': 'Machine updated'}), 200

# 5) Delete - DELETE /api/machines/<machine_id>
@machines_bp.route('/<machine_id>', methods=['DELETE'])
def delete_machine(machine_id):
    db = get_db()

    #TODO: no auth, no check admin, no cleaning input
    db.execute("DELETE FROM machines WHERE id = ?", (machine_id,))
    db.commit()

    return jsonify({'message': 'Machine deleted'}), 200

