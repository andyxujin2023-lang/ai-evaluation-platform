# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI Operations Evaluation Platform (AIOps Evaluation Platform)** - a system for evaluating Dify operation intelligent agent capabilities. The platform is fully implemented with both backend and frontend components.

## Technology Stack

- **Backend**: Python + FastAPI + SQLite
- **Frontend**: React 18 + Tailwind CSS + ECharts + Vite
- **External APIs**: Dify API (for answers), Tongyi Qianwen API (for scoring)

## Code Architecture

### Backend Structure (backend/)

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── core/
│   │   ├── config.py        # Settings management (Pydantic)
│   │   └── database.py      # SQLite connection and initialization
│   ├── models/
│   │   └── schemas.py       # Pydantic models for API requests/responses
│   ├── services/
│   │   ├── dify_service.py      # Dify API integration
│   │   ├── scoring_service.py   # Tongyi Qianwen AI scoring
│   │   ├── test_engine.py       # Automated test execution
│   │   └── config_service.py    # System config management
│   └── api/
│       ├── datasets.py       # Test question CRUD
│       ├── test_batches.py   # Test batch management
│       ├── test_runs.py      # Test execution and reports
│       └── config.py         # System config endpoints
├── init_db.sql               # Database schema
├── requirements.txt
└── .env.example
```

### Frontend Structure (frontend/)

```
frontend/
├── src/
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   └── pages/
│       ├── Dashboard.jsx    # Overview dashboard
│       ├── TestBatches.jsx  # Test batch management
│       ├── Datasets.jsx     # Test set management
│       ├── TestRuns.jsx     # Test execution
│       ├── TestReport.jsx   # Test results visualization
│       └── SystemConfig.jsx # API configuration
├── package.json
├── vite.config.js
└── tailwind.config.js
```

### Database Schema

Key tables:
- `test_batches` - Groups of test questions
- `datasets` - Individual test questions (linked to batches)
- `test_runs` - Test execution sessions
- `test_results` - Individual question results with 4-dimensional scoring
- `test_logs` - Detailed execution logs
- `system_config` - API keys and settings (stored in DB)

## Common Development Commands

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys or configure via UI later

# Initialize database (runs automatically on app startup)
python init_db.py

# Run development server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at http://localhost:8000
API docs at http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Frontend runs at http://localhost:5173 (Vite default)

## Key API Endpoints

- `GET /api/test-batches` - List test batches
- `POST /api/test-batches` - Create test batch
- `GET /api/datasets` - List test questions
- `POST /api/datasets/import` - Import JSON test set
- `POST /api/test-runs` - Start new test run
- `GET /api/test-runs/{id}/progress` - Get test progress
- `GET /api/test-runs/{id}/report` - Get test report
- `GET /api/config` - Get system config
- `PUT /api/config` - Update system config

## Scoring Dimensions

Scores are calculated with temperature=0 for reproducibility:
- **Accuracy (40%)** - Factual correctness vs standard answer
- **Completeness (30%)** - Coverage of all aspects
- **Actionability (20%)** - Concrete, actionable guidance
- **Consistency (10%)** - Logical coherence

## Important Notes

- System configuration (API keys) is stored in the database, can be set via UI
- Test runs execute asynchronously, poll `/progress` endpoint for status
- All database interactions use SQLite with connection pooling via context manager
- Frontend uses enterprise-style dark theme similar to Datadog/Grafana
