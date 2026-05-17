from flask import Blueprint, request, jsonify
import sqlite3

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/login', methods=['POST'])
def login():
    # Estrae i dati JSON inviati dal front-end
    data = request.get_json()
    if not data or 'username' not in data or 'password' not in data:
        return jsonify({"success": False, "message": "Missing Fields"}), 400

    username = data['username']
    password = data['password']

    # Connessione al database locale
    conn = sqlite3.connect('laundry.db')
    cursor = conn.cursor()

    # =========================================================================
    # VULNERABILITÀ: SQL INJECTION
    # L'input dell'utente viene inserito direttamente tramite f-string.
    # Questo permette di alterare la struttura logica della query SQL originaria.
    # =========================================================================
    query = f"SELECT id, username, role FROM users WHERE username = '{username}' AND password = '{password}'"
    
    try:
        cursor.execute(query)
        user = cursor.fetchone() # Prende il primo record che soddisfa la condizione
    except sqlite3.Error as e:
        conn.close()
        # Restituire l'errore SQL grezzo facilita il debugging dell'attaccante
        return jsonify({"success": False, "error": str(e)}), 500

    conn.close()

    # Verifica se la query ha prodotto un risultato
    if user:
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