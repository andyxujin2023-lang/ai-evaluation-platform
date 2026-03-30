"""
数据库迁移脚本 - 添加用户认证和组织管理功能
运行前请先备份数据库！
"""
import sqlite3
import os
from pathlib import Path


def migrate_database():
    db_path = Path(__file__).parent / "ai_evaluation.db"

    if not db_path.exists():
        print("数据库不存在，无需迁移")
        return

    print("开始迁移数据库...")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # 检查是否已经迁移过
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            print("数据库已经迁移过了")
            return

        # 开始事务
        conn.execute("BEGIN TRANSACTION")

        # 1. 创建 organizations 表
        print("创建 organizations 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 2. 创建 users 表
        print("创建 users 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                hashed_password TEXT NOT NULL,
                name TEXT NOT NULL,
                organization_id TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        """)

        # 3. 创建 sessions 表
        print("创建 sessions 表...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # 4. 为现有表添加 organization_id 列
        print("为现有表添加 organization_id 列...")

        tables_to_alter = [
            "test_batches",
            "datasets",
            "test_runs",
            "test_results",
            "test_logs"
        ]

        for table in tables_to_alter:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN organization_id TEXT")
                print(f"  - {table} 表添加成功")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"  - {table} 表已存在 organization_id 列，跳过")
                else:
                    raise

        # 5. 创建索引
        print("创建索引...")
        indexes = [
            ("idx_organizations_slug", "organizations", "slug"),
            ("idx_users_org", "users", "organization_id"),
            ("idx_users_email", "users", "email"),
            ("idx_sessions_token", "sessions", "session_token"),
            ("idx_sessions_user", "sessions", "user_id"),
            ("idx_sessions_expires", "sessions", "expires_at"),
            ("idx_test_batches_org", "test_batches", "organization_id"),
            ("idx_datasets_org", "datasets", "organization_id"),
            ("idx_test_runs_org", "test_runs", "organization_id"),
            ("idx_test_results_org", "test_results", "organization_id"),
            ("idx_test_logs_org", "test_logs", "organization_id"),
        ]

        for idx_name, table, column in indexes:
            try:
                cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table}({column})")
                print(f"  - {idx_name} 创建成功")
            except Exception as e:
                print(f"  - {idx_name} 创建失败: {e}")

        # 提交事务
        conn.commit()
        print("\n数据库迁移成功！")

    except Exception as e:
        conn.rollback()
        print(f"\n迁移失败: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
