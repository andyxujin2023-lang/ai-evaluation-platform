import requests
import json

base_url = "http://localhost:8000"

# Get test runs
print("=== Getting test runs ===")
runs_response = requests.get(f"{base_url}/api/test-runs")
print(f"Status: {runs_response.status_code}")
runs = runs_response.json()
print(f"Found {len(runs)} test runs")

if runs:
    first_run_id = runs[0]['id']
    print(f"\nFirst run ID: {first_run_id}")

    # Get report
    print("\n=== Getting report ===")
    report_response = requests.get(f"{base_url}/api/test-runs/{first_run_id}/report")
    print(f"Status: {report_response.status_code}")
    if report_response.status_code == 200:
        report = report_response.json()
        print(f"Report keys: {list(report.keys())}")
        print(f"Overview: {json.dumps(report.get('overview', {}), indent=2, ensure_ascii=False)[:500]}")
    else:
        print(f"Error: {report_response.text}")

    # Get logs
    print("\n=== Getting logs ===")
    logs_response = requests.get(f"{base_url}/api/test-runs/{first_run_id}/logs")
    print(f"Status: {logs_response.status_code}")
    if logs_response.status_code == 200:
        logs = logs_response.json()
        print(f"Found {len(logs)} log entries")
