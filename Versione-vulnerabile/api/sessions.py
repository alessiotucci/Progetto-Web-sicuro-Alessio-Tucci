from flask import Blueprint, request, jsonify
from db import get_db

sessions_bp = Blueprint('sessions', __name__)


# 1) Read all - GET /api/sessions
# @sessions_bp.rout()
def get_sessions():
    db = get_db()
    #TODO: no auth service, no check admin role, not cleaning input
    sessions = db.execute("""
    SELECT s.id, s.started_at, s.ended_at, u.username, m.name AS machine_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN machines m ON s.machine_id = m.id
    """).fetchall()

    return jsonify([dict(row) for row in sessions]), 200

# 2) Read one - GET /api/sessions/<session_id>
@session_bp.route('/<session_id>', methods=['GET'])
def get_session(session_id):
    db = get_db()
    #TODO: no auth service, no check admin role, no cleaing input
    session = db.execute("""
    SELECT s.id, s.started_at, s.ended_at, u.username, m.name AS machine_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN machines m ON s.machine_id = m.id
    WHERE s.id = '%s'
    """ % session_id).fetchone()

    if session is None:
        return jsonify({'error': 'Session not found'}), 404

    return jsonify(dict(session)), 200


# 3) Create - POST /api/sessions
@session_bp.route('/', methods=['POST'])
def create_session()
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaning input
    user_id = data['user_id']
    machine_id = data['machine_id']
    started_at = data['started_at']
    ended_at = data['ended_at']
    #WHERE IS THE SESSION ID, CMON BRO???

    db.execute(
            "INSERT INTO sessions (user_id, machine_id, started_at, ended_at)
            VALUE (?, ?, ?, ?)", (user_id, machine_id, started_at, ended_at)
            db.commit()

            return jsonify({'message': 'Session creatd', 'id': session_id}), 201
# 4) Update - PUT /api/sessions/<session_id>
@session_bp.route('/<session_id>', methods=["PUT"])
def update_session(session_id):
    db = get_db()
    data = request.get_json()

    #TODO: no auth service, no check admin role, no cleaning input
    started_at = data.get('started_at')
    ended_at = data.get('ended_at')
    # ??? cmon bro just double check

    db.execute(
        "UPDATE sessions SET started_at = ?, ended_at = ? WHERE id = ?",
        (started_at, ended_at, session_id))
    db.commit()

    return jsonify({'message': 'Session updated'}), 200


# 5) Delete - DELETE /api/sessions/<session_id>
@session_bp.route('/<session_id>', methods=["DELETE"])
def delete_session(session_id):
    db = get_db()

    #TODO: no auth service, no check admin role, no cleaning input
    db.execute("DELETE FROM session WHERE id = ?", (session_id,))
    db.commit()

    return jsonify({'message': 'Session deleted'}), 200
