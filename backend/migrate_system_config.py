"""
数据库迁移脚本 - 将 system_config 表改为组织级别
运行前请先备份数据库！
"""
import sqlite3
import os
from pathlib import Path
import secrets


def generate_id() -> str:
    """生成唯一ID"""
    return secrets.token_urlsafe(16)


def migrate_database():
    db_path = Path(__file__).parent / "ai_evaluation.db"

    if not db_path.exists():
        print("数据库不存在，无需迁移")
        return

    print("开始迁移 system_config 表...")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # 检查是否已经迁移过
        cursor.execute("PRAGMA table_info(system_config)")
        columns = [col[1] for col in cursor.fetchall()]

        if "organization_id" in columns:
            print("system_config 表已经迁移过了")
            return

        # 开始事务
        conn.execute("BEGIN TRANSACTION")

        # 1. 备份现有数据
        print("备份现有配置...")
        cursor.execute("SELECT key, value, description FROM system_config")
        old_configs = cursor.fetchall()

        # 2. 重命名旧表
        print("重命名旧表...")
        cursor.execute("ALTER TABLE system_config RENAME TO system_config_old")

        # 3. 创建新表
        print("创建新表...")
        cursor.execute("""
            CREATE TABLE system_config (
                id TEXT PRIMARY KEY,
                organization_id TEXT,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization_id, key),
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
            )
        """)

        # 4. 获取所有组织
        print("获取组织列表...")
        cursor.execute("SELECT id FROM organizations")
        organizations = cursor.fetchall()

        # 5. 为每个组织复制配置
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        if organizations:
            print(f"为 {len(organizations)} 个组织初始化配置...")
            for org in organizations:
                org_id = org[0]
                for key, value, description in old_configs:
                    config_id = generate_id()
                    cursor.execute(
                        """
                        INSERT INTO system_config
                        (id, organization_id, key, value, description, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (config_id, org_id, key, value, description, now, now)
                    )
        else:
            print("没有组织，保留全局配置作为默认...")
            for key, value, description in old_configs:
                config_id = generate_id()
                cursor.execute(
                    """
                    INSERT INTO system_config
                    (id, organization_id, key, value, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (config_id, None, key, value, description, now, now)
                )

        # 6. 创建索引
        print("创建索引...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_config_org ON system_config(organization_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_system_config_org_key ON system_config(organization_id, key)")

        # 7. 删除旧表（可选，先保留以便回滚）
        # cursor.execute("DROP TABLE system_config_old")

        # 提交事务
        conn.commit()
        print("\nsystem_config 表迁移成功！")
        print("旧表已重命名为 system_config_old，确认无误后可手动删除")

    except Exception as e:
        conn.rollback()
        print(f"\n迁移失败: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
