import sqlite3
from pathlib import Path

def init_db():
    schema_path = Path(__file__).parent / "init_db.sql"
    db_path = Path(__file__).parent / "ai_evaluation.db"

    print(f"Creating database at: {db_path.absolute()}")

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()

    with sqlite3.connect(str(db_path)) as conn:
        conn.executescript(schema)
        print("Database tables created successfully!")

        # Verify tables
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"Tables created: {[t[0] for t in tables]}")

if __name__ == "__main__":
    init_db()
