from flask import Flask, send_from_directory, jsonify
import os



# Configura Flask per usare la cartella corrente per file statici e HTML
app = Flask(__name__, template_folder='.', static_folder='.', static_url_path='')

## Aggiunta suggerita da Gemini
from api.auth import auth_bp
app.register_blueprint(auth_bp)

# 1. Route per servire i file della cartella "shared" (le immagini delle lavatrici)
@app.route('/shared/<path:filename>')
def serve_shared(filename):
    shared_dir = os.path.abspath(os.path.join(app.root_path, '../shared'))
    return send_from_directory(shared_dir, filename)

# 2. Route principale: serve l'index.html per la Home
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

# 3. Router di fallback per l'SPA: serve index.html anche se l'utente ricarica su una rotta fittizia
@app.route('/login')
@app.route('/signup')
@app.route('/dashboard')
@app.route('/admin')
def spa_routes():
    return send_from_directory('.', 'index.html')

if __name__ == '__main__':
    # Avvia il server in modalità debug sulla porta 5000
    app.run(debug=True, port=5000)