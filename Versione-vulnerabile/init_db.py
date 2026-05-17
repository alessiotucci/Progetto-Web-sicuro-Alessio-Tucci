# File to create the database instance
import sqlite3

def init_db():
    # Crea il file del database (se non esiste) e si connette
    conn = sqlite3.connect('laundry.db')
    cursor = conn.cursor()

    # 1. Tabella Utenti (Vettore per SQLi)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    ''')

    # 2. Tabella Macchinari (Lavanderia)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS machines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            current_user_id INTEGER,
            FOREIGN KEY(current_user_id) REFERENCES users(id)
        )
    ''')

    # 3. Tabella Note/Segnalazioni (Vettore per Stored XSS)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL
        )
    ''')

    # Inserimento dati di test (Usa INSERT OR IGNORE per evitare duplicati se riesegui lo script)
    # Utenti di test
    cursor.execute("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', 'SuperSegreto2026', 'admin')")
    cursor.execute("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (2, 'alessio', 'user123', 'user')")

    # Stato iniziale dei 3 macchinari della lavanderia
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status, current_user_id) VALUES ('l1', 'Lavatrice 1', 'available', NULL)")
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status, current_user_id) VALUES ('l2', 'Lavatrice 2', 'in_use_2h', 1)")
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status, current_user_id) VALUES ('a1', 'Asciugatrice 1', 'available', NULL)")

    conn.commit()
    conn.close()
    print("Database 'laundry.db' inizializzato con successo con tabelle e dati di test.")

if __name__ == '__main__':
    init_db()