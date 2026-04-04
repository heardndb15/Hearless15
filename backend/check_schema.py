import sqlite3
conn = sqlite3.connect('users.db')
c = conn.cursor()
for t in ['users', 'lectures', 'sos_events']:
    print(f"\nTable: {t}")
    c.execute(f"PRAGMA table_info({t})")
    for row in c.fetchall():
        print(row)
conn.close()
