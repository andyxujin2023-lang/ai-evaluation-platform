-- AI运维评测平台数据库初始化脚本

CREATE TABLE IF NOT EXISTS test_batches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS datasets (
    id TEXT PRIMARY KEY,
    batch_id TEXT,
    question TEXT NOT NULL,
    standard_answer TEXT NOT NULL,
    keywords TEXT NOT NULL,  -- JSON array stored as string
    category TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES test_batches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY,
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
    FOREIGN KEY (batch_id) REFERENCES test_batches(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY,
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
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS test_logs (
    id TEXT PRIMARY KEY,
    test_run_id TEXT NOT NULL,
    question_id TEXT,
    log_type TEXT NOT NULL,  -- info, error, dify_request, dify_response, scoring_request, scoring_response
    message TEXT NOT NULL,
    details TEXT,  -- JSON details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT OR IGNORE INTO system_config (key, value, description) VALUES
('DIFY_API_URL', 'https://api.dify.ai/v1', 'Dify API 地址'),
('DIFY_API_KEY', '', 'Dify API 密钥'),
('TONGYI_API_KEY', '', '通义千问 API 密钥'),
('TONGYI_MODEL', 'qwen-max', '通义千问模型名称');

CREATE INDEX IF NOT EXISTS idx_datasets_batch ON datasets(batch_id);
CREATE INDEX IF NOT EXISTS idx_datasets_category ON datasets(category);
CREATE INDEX IF NOT EXISTS idx_test_runs_created ON test_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_batch ON test_runs(batch_id);
CREATE INDEX IF NOT EXISTS idx_test_results_run ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_score ON test_results(total_score);
CREATE INDEX IF NOT EXISTS idx_test_logs_run ON test_logs(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_logs_question ON test_logs(question_id);
