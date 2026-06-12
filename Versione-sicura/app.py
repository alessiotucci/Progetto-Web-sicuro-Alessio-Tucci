from flask import Flask, send_from_directory
import os

# Importa i moduli del backend
from api.db import close_db
from api.machines import machines_bp
from api.sessions import sessions_bp
from api.notes import notes_bp
from api.users import users_bp
from api.auth import auth_bp

# Configura Flask per il front-end
app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

# Registra le API (Backend)
app.register_blueprint(auth_bp,     url_prefix='/api/auth')
app.register_blueprint(users_bp,    url_prefix='/api/users')
app.register_blueprint(machines_bp, url_prefix='/api/machines')
app.register_blueprint(sessions_bp, url_prefix='/api/sessions')
app.register_blueprint(notes_bp,    url_prefix='/api/notes')

# Chiude il DB a fine richiesta
app.teardown_appcontext(close_db)


# --- ROTTE FRONT-END ---

@app.route('/shared/<path:filename>')
def serve_shared(filename):
    shared_dir = os.path.abspath(os.path.join(app.root_path, '../shared'))
    return send_from_directory(shared_dir, filename)

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/login')
@app.route('/signup')
@app.route('/dashboard')
@app.route('/admin')
@app.route('/profile')
def spa_routes():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
