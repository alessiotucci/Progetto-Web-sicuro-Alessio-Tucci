import sqlite3

def init_db():
    conn = sqlite3.connect('laundry.db')
    cursor = conn.cursor()
    cursor.execute("PRAGMA foreign_keys = ON;")

    # Drop existing tables (order matters due to FK)
    cursor.execute('DROP TABLE IF EXISTS notes')
    cursor.execute('DROP TABLE IF EXISTS sessions')
    cursor.execute('DROP TABLE IF EXISTS machines')
    cursor.execute('DROP TABLE IF EXISTS machine_statuses')
    cursor.execute('DROP TABLE IF EXISTS users')

    # 1. Users
    cursor.execute('''
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user'
        )
    ''')

    # 2. Machine statuses (lowercase, singular – as used in machines.py)
    cursor.execute('''
        CREATE TABLE machine_statuses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL
        )
    ''')

    # 3. Machines
    cursor.execute('''
        CREATE TABLE machines (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status_id INTEGER,
            FOREIGN KEY(status_id) REFERENCES machine_statuses(id)
        )
    ''')

    # 4. Sessions (lowercase, plural – as used in sessions.py)
    cursor.execute('''
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            machine_id TEXT,
            started_at TEXT,
            ended_at TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(machine_id) REFERENCES machines(id)
        )
    ''')

    # 5. Notes
    cursor.execute('''
        CREATE TABLE notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            machine_id TEXT,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(machine_id) REFERENCES machines(id)
        )
    ''')

    # Insert sample data
    cursor.execute("INSERT INTO machine_statuses (id, label) VALUES (1, 'Available'), (2, 'In Use'), (3, 'Maintenance')")
    cursor.execute("INSERT INTO users (id, username, password, role) VALUES (1, 'admin', 'SuperSegreto', 'admin'), (2, 'alessio', 'user123', 'user')")
    cursor.execute("INSERT INTO machines (id, name, status_id) VALUES ('l1', 'Lavatrice 1', 1), ('l2', 'Lavatrice 2', 1), ('a1', 'Asciugatrice 1', 1)")

    conn.commit()
    conn.close()
    print("Database inizializzato correttamente con le tabelle attese dall'API.")

if __name__ == '__main__':
    init_db()
