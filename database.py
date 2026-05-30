import sqlite3

conn = sqlite3.connect("todo.db",check_same_thread=False)
conn.row_factory = sqlite3.Row

cursor = conn.cursor()

cursor.execute("""CREATE TABLE IF NOT EXISTS ai_todo(
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               title TEXT,
               description TEXT,
               status TEXT DEFAULT "pending",
               created_at TEXT DEFAULT (datetime('now', '+5 hours', '+30 minutes')),
               due_date TEXT,
               completed BOOLEAN DEFAULT false
               )""")

conn.commit()