-- AI运维评测平台数据库初始化脚本

-- 组织表
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    name TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    switch_organization_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_batches (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    batch_id TEXT,
    question TEXT NOT NULL,
    standard_answer TEXT NOT NULL,
    keywords TEXT NOT NULL,  -- JSON array stored as string
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES test_batches(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    batch_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed
    total_questions INTEGER DEFAULT 0,
    completed_questions INTEGER DEFAULT 0,
    average_score REAL,
    hallucination_rate REAL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES test_batches(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    test_run_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question TEXT NOT NULL,
    standard_answer TEXT NOT NULL,
    ai_answer TEXT,
    accuracy REAL,
    completeness REAL,
    actionability REAL,
    consistency REAL,
    total_score REAL,
    issues TEXT,
    category TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_logs (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    test_run_id TEXT NOT NULL,
    question_id TEXT,
    log_type TEXT NOT NULL,  -- info, error, dify_request, dify_response, scoring_request, scoring_response
    message TEXT NOT NULL,
    details TEXT,  -- JSON details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, key),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- 注意：默认配置现在是组织级别的，不在这里插入全局默认配置

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_test_batches_org ON test_batches(organization_id);
CREATE INDEX IF NOT EXISTS idx_datasets_org ON datasets(organization_id);
CREATE INDEX IF NOT EXISTS idx_datasets_batch ON datasets(batch_id);
CREATE INDEX IF NOT EXISTS idx_datasets_category ON datasets(category);
CREATE INDEX IF NOT EXISTS idx_test_runs_org ON test_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_created ON test_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_batch ON test_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_test_results_org ON test_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(total_score);
CREATE INDEX IF NOT EXISTS idx_test_logs_org ON test_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_run ON test_logs(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_question ON test_logs(question_id);
CREATE INDEX IF NOT EXISTS idx_system_config_org ON system_config(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_config_org_key ON system_config(organization_id, key);
