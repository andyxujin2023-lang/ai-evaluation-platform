import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "ai_evaluation.db"

print(f"Checking database at: {db_path}\n")

with sqlite3.connect(str(db_path)) as conn:
    cursor = conn.cursor()

    print("=== Test Runs ===")
    cursor.execute("SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 5")
    runs = cursor.fetchall()
    if runs:
        for run in runs:
            print(f"ID: {run[0]}, Name: {run[1]}, Status: {run[3]}, Questions: {run[4]}/{run[5]}")
    else:
        print("No test runs found")

    print("\n=== Test Results ===")
    cursor.execute("SELECT test_run_id, COUNT(*) as count FROM test_results GROUP BY test_run_id")
    results = cursor.fetchall()
    if results:
        for res in results:
            print(f"Test Run: {res[0]}, Results: {res[1]}")
    else:
        print("No test results found")

    print("\n=== Datasets ===")
    cursor.execute("SELECT COUNT(*) as count FROM datasets")
    datasets = cursor.fetchone()
    print(f"Total questions: {datasets[0]}")
