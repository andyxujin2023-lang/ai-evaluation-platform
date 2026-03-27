import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "ai_evaluation.db"

    print(f"Migrating database at: {db_path.absolute()}")

    with sqlite3.connect(str(db_path)) as conn:
        cursor = conn.cursor()

        # Check if test_batches table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_batches'")
        if cursor.fetchone():
            print("test_batches table already exists")
        else:
            cursor.execute("""
                CREATE TABLE test_batches (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            print("Created test_batches table")

        # Check if datasets has batch_id column
        cursor.execute("PRAGMA table_info(datasets)")
        columns = [col[1] for col in cursor.fetchall()]
        if "batch_id" not in columns:
            cursor.execute("ALTER TABLE datasets ADD COLUMN batch_id TEXT REFERENCES test_batches(id) ON DELETE SET NULL")
            print("Added batch_id column to datasets")

            # Create index
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_datasets_batch ON datasets(batch_id)")
            print("Created index on datasets(batch_id)")
        else:
            print("datasets already has batch_id column")

        # Check if test_runs has batch_id column
        cursor.execute("PRAGMA table_info(test_runs)")
        columns = [col[1] for col in cursor.fetchall()]
        if "batch_id" not in columns:
            cursor.execute("ALTER TABLE test_runs ADD COLUMN batch_id TEXT REFERENCES test_batches(id) ON DELETE SET NULL")
            print("Added batch_id column to test_runs")

            # Create index
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_test_runs_batch ON test_runs(batch_id)")
            print("Created index on test_runs(batch_id)")
        else:
            print("test_runs already has batch_id column")

        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
