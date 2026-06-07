import sqlite3
from flask import g

# TODO: database path is hardcoded!
DATABASE = 'laundry.db'

def get_db():
    """Opens a new database connection if not already open"""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        d.db.row_factory = sqlite3.Row #lets me access columns by name
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()
