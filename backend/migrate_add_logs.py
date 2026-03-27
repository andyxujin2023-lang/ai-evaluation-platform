import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "ai_evaluation.db"

    print(f"Migrating database at: {db_path.absolute()}")

    with sqlite3.connect(str(db_path)) as conn:
        cursor = conn.cursor()

        # Check if test_logs table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_logs'")
        if cursor.fetchone():
            print("test_logs table already exists, skipping creation")
        else:
            cursor.execute("""
                CREATE TABLE test_logs (
                    id TEXT PRIMARY KEY,
                    test_run_id TEXT NOT NULL,
                    question_id TEXT,
                    log_type TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
                )
            """)
            print("Created test_logs table")

            # Add indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_logs_run ON test_logs(test_run_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_logs_question ON test_logs(question_id)")
            print("Created indexes for test_logs")

        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
