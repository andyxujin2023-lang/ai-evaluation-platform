# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI Operations Evaluation Platform (AIOps Evaluation Platform)** - a system for evaluating Dify operation intelligent agent capabilities. The platform is fully implemented with both backend and frontend components, and includes user authentication and organization-based data isolation.

## Technology Stack

- **Backend**: Python + FastAPI + SQLite
- **Frontend**: React 18 + Tailwind CSS + ECharts + Vite
- **External APIs**: Dify API (for answers), Tongyi Qianwen API (for scoring)
- **Authentication**: Session-based cookies with bcrypt password hashing

## Code Architecture

### Backend Structure (backend/)

```
backend/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── core/
│   │   ├── config.py        # Settings management (Pydantic)
│   │   ├── database.py      # SQLite connection and initialization
│   │   └── auth.py          # Authentication core (password hashing, sessions)
│   ├── models/
│   │   └── schemas.py       # Pydantic models for API requests/responses
│   ├── services/
│   │   ├── dify_service.py      # Dify API integration
│   │   ├── scoring_service.py   # Tongyi Qianwen AI scoring
│   │   ├── test_engine.py       # Automated test execution
│   │   └── config_service.py    # System config management
│   └── api/
│       ├── auth.py          # Authentication endpoints (login/register/logout)
│       ├── users.py         # User management endpoints (admin only)
│       ├── datasets.py       # Test question CRUD
│       ├── test_batches.py   # Test batch management
│       ├── test_runs.py      # Test execution and reports
│       └── config.py         # System config endpoints
├── init_db.sql               # Database schema (includes auth tables, located in backend/)
├── migrate_add_auth.py       # Migration script for adding auth to existing DB
├── requirements.txt
└── .env.example
```

### Frontend Structure (frontend/)

```
frontend/
├── src/
│   ├── App.jsx              # Main app with routing and auth protection
│   ├── main.jsx             # Entry point
│   ├── api/
│   │   └── index.js         # API client with auth handling
│   ├── contexts/
│   │   └── AuthContext.jsx  # Authentication context provider
│   ├── components/
│   │   └── ProtectedRoute.jsx  # Route protection wrapper
│   └── pages/
│       ├── Login.jsx        # Login page
│       ├── Register.jsx     # Registration page
│       ├── UserManagement.jsx  # User management (admin only)
│       ├── OrganizationManagement.jsx  # Organization management (admin only)
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
- `organizations` - Organizations/teams for data isolation
- `users` - User accounts with roles (admin/user) and organization links
- `sessions` - Session tokens for authentication (7-day expiry)
- `test_batches` - Groups of test questions (organization-scoped)
- `datasets` - Individual test questions (organization-scoped)
- `test_runs` - Test execution sessions (organization-scoped)
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

# Initialize fresh database (runs automatically on app startup)
# Includes auth tables

# Or migrate existing database to add auth
python migrate_add_auth.py

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

## Authentication System

### Key Features
- User registration with organization creation (first user is admin)
- Session-based authentication via HTTP-only cookies
- Role-based access control (admin/user roles)
- Organization-level data isolation (users can only access their org's data)
- Protected API endpoints using FastAPI dependencies

### Auth Endpoints
- `POST /api/auth/register` - Register new user and organization
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/users` - List users (admin only)
- `PUT /api/users/{id}/role` - Update user role (admin only)
- `PUT /api/users/{id}/active` - Toggle user active status (admin only)

### Important Notes
- All API endpoints except `/api/auth/register` and `/api/auth/login` require authentication
- First registered user automatically becomes admin of their organization
- Sessions expire after 7 days
- Passwords are hashed using bcrypt
- Data isolation is enforced at the API layer via `organization_id` filtering

## Key API Endpoints

- `GET /api/test-batches` - List test batches (org-scoped)
- `POST /api/test-batches` - Create test batch
- `GET /api/datasets` - List test questions (org-scoped)
- `POST /api/datasets/import` - Import JSON test set
- `POST /api/test-runs` - Start new test run
- `GET /api/test-runs/{id}/progress` - Get test progress
- `GET /api/test-runs/{id}/report` - Get test report
- `GET /api/config` - Get system config
- `PUT /api/config` - Update system config
- `GET /api/organizations` - List organizations (admin only)
- `POST /api/organizations` - Create organization (admin only)
- `PUT /api/organizations/{id}` - Update organization (admin only)

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
- All data is organization-isolated - users must register/login first
- First user to register becomes the organization admin

## Deployment and Updates

### Deployment
- **Full deployment guide**: See `DEPLOY.md` for complete production deployment instructions
- **Production deployment options**:
  - Linux: systemd + Gunicorn + Nginx (recommended)
  - Cross-platform: PM2 process manager
  - Windows: IIS + Windows Service

### Version Updates
- **Update guide**: See `UPDATE.md` for detailed update instructions
- **Automated update scripts**:
  - Windows: Run `update.bat` for automated update process
  - Linux: Run `update.sh` for automated update process
- **Manual update steps**:
  1. Backup database (critical!)
  2. Pull latest code: `git pull origin master`
  3. Run database migrations: `python migrate_*.py` scripts in order
  4. Update dependencies: `pip install -r requirements.txt` (backend) and `npm install` (frontend)
  5. Rebuild frontend: `npm run build`
  6. Restart services

### Database Migration Scripts
Migration scripts are located in the `backend/` directory:
- `migrate_add_auth.py` - Adds authentication tables (users, organizations, sessions)
- `migrate_system_config.py` - Migrates system config to organization-level
- `migrate_sessions.py` - Adds organization switching support to sessions
- The `init_database()` function in `app/core/database.py` automatically handles migrations on startup when possible
