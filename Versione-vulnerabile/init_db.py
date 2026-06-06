# File to create the database instance
import sqlite3

def init_db():
    # Crea il file del database (se non esiste) e si connette
    conn = sqlite3.connect('laundry.db')
    cursor = conn.cursor()

    # 0. Abilitare il supporto alle FK
    cursor.execute("PRAGMA foreign_keys = ON;")

    ## eliminazione del vecchio db
    cursor.execute('''DROP TABLE IF EXISTS notes''')
    cursor.execute('''DROP TABLE IF EXISTS session''')
    cursor.execute('''DROP TABLE IF EXISTS machines''')
    cursor.execute('''DROP TABLE IF EXISTS machines_statuses''')
    cursor.execute('''DROP TABLE IF EXISTS users''')

    # 1. Tabella Users
    cursor.execute('''
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    ''')

    # 2. Tabella statuses
    cursor.execute('''
        CREATE TABLE machines_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL
        )
    ''')

    # 3. Tabella Macchinari (Lavanderia)
    cursor.execute('''
        CREATE TABLE machines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status_id INTEGER,
            FOREIGN KEY(status_id) REFERENCES machines_statuses(id)
        )
    ''')

    # 4. Tabella sessions
    cursor.execute('''
        CREATE TABLE session(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            machine_id TEXT,
            started_at TEXT,
            ended_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(machine_id) REFERENCES machines(id)

        )
    ''')
    # 5. Tabella notes
    cursor.execute('''
        CREATE TABLE notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        machine_id TEXT,
        content TEXT NOT NULL,
        created_at TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(machine_id) REFERENCES machines(id)
        )
    ''')

    # Inserimento dati di test (Usa INSERT OR IGNORE per evitare duplicati se riesegui lo script)
    cursor.execute("INSERT INTO machines_statuses (id, label) VALUES (1,'Available')")
    cursor.execute("INSERT INTO machines_statuses (id, label) VALUES (2, 'In Use')")
    cursor.execute("INSERT INTO machines_statuses (id, label) VALUES (3,'Maintenance')")

    # Utenti di test
    cursor.execute("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', 'SuperSegreto2026', 'admin')")
    cursor.execute("INSERT OR IGNORE INTO users (id, username, password, role) VALUES (2, 'alessio', 'user123', 'user')")

    # Stato iniziale dei 3 macchinari della lavanderia
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status_id) VALUES('l1', 'Lavatrice 1', 1)")
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status_id) VALUES('l2', 'Lavatrice 2', 1)")
    cursor.execute("INSERT OR IGNORE INTO machines (id, name, status_id) VALUES('a1', 'Asciugatrice 1', 2)")

    conn.commit()
    conn.close()
    print("Database 'laundry.db' inizializzato con successo con tabelle e dati di test.")
    print("Fare le cose a mano (copiando il codice keyword by keyword è dura!")

if __name__ == '__main__':
    init_db()
