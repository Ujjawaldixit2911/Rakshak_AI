import sqlite3
import os

for db_path in ["rakshak.db", "../rakshak.db"]:
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(user_safety_profiles)")
        cols = [c[1] for c in cur.fetchall()]
        if cols and "role" not in cols:
            print(f"Adding role column to {db_path}")
            cur.execute("ALTER TABLE user_safety_profiles ADD COLUMN role VARCHAR(50) DEFAULT 'citizen'")
            conn.commit()
        else:
            print(f"user_safety_profiles in {db_path}: {cols}")
        conn.close()
