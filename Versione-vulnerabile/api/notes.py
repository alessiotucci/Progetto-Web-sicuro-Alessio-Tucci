from flask import Blueprint, request, jsonify
from api.db import get_db

notes_bp = Blueprint('notes', __name__)

# 1) Read all - GET /api/notes
@notes_bp.route('/', methods=['GET'])
def get_notes():
    db = get_db()
    #TODO: no auth service, no check admin role, not cleaning input
    notes = db.execute("""
    SELECT n.id, n.content, n.created_at, u.username, m.name
    FROM notes n
    JOIN users u ON n.user_id = u.id
    JOIN machines m ON n.machine_id = m.id
    """).fetchall()

    return jsonify([dict(row) for row in notes]), 200

# 2) Read one - GET /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['GET'])
def get_note(note_id):
    db = get_db()
    #TODO: no auth service, no check admin role, not cleaning input
    note = db.execute("""
    SELECT n.id, n.content, n.created_at, u.username, m.name
    FROM notes n
    JOIN users u ON n.user_id = u.id
    JOIN machines m ON n.machine_id = m.id
    WHERE n.id = '%s'
    """ % note_id).fetchone()

    if note is None:
        return jsonify({'error': 'Note not found'}), 404

    return jsonify(dict(note)), 200

# 3) Create - POST /api/notes
@notes_bp.route('/', methods=['POST'])
def create_note():
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaing input
    note_id = data['id']
    user_id = data['user_id']
    machine_id = data['machine_id']
    content = data['content']
    #created_at ???

    db.execute(
            "INSERT INTO notes (id, user_id, machine_id, content) VALUE (?, ?, ?, ?)"
            , (note_id, user_id, machine_id, content)
            )
    db.commit()

    return jsonify({'message': 'Note created', 'id': note_id}), 201


# 4) Update - PUT /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['PUT'])
def update_note(note_id):
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaning input
    machine_id = data.get('machine_id')
    content = date.get('content')
    # created at ???

    db.execute(
            "UPDATE notes SET machine_id = ?, content = ? WHERE id = ?",
            (machine_id, content, note_id)
            )
    db.commit()

    return jsonify({'message': 'Note updated'}), 200

# 5) Delete - DELETE /api/notes/<note_id>
@notes_bp.route('/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    db = get_db()

    #TODO: no auth service, no check admin role, no cleaning input
    db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    db.commit()

    return jsonify({'message': 'Note deleted'}), 200

