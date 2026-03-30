import sqlite3
import json
import shutil
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import get_settings

settings = get_settings()


def get_db_path():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return "ai_evaluation.db"


@contextmanager
def get_db_connection():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    db_path = Path(get_db_path())
    schema_path = Path(__file__).parent.parent.parent / "init_db.sql"

    # 检查是否需要迁移 system_config 表
    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # 检查 system_config 表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config'")
        table_exists = cursor.fetchone() is not None

        if table_exists:
            # 检查是否有 organization_id 列
            cursor.execute("PRAGMA table_info(system_config)")
            columns = [col[1] for col in cursor.fetchall()]

            if "organization_id" not in columns:
                print("需要迁移 system_config 表，正在备份...")
                # 备份数据库
                backup_path = db_path.parent / f"{db_path.name}.backup.{Path().stat().st_mtime_ns}"
                shutil.copy2(db_path, backup_path)
                print(f"数据库已备份到: {backup_path}")

                # 进行迁移
                print("开始迁移 system_config 表...")
                try:
                    import secrets
                    from datetime import datetime, timezone

                    def generate_id():
                        return secrets.token_urlsafe(16)

                    # 备份现有数据
                    cursor.execute("SELECT key, value, description FROM system_config")
                    old_configs = cursor.fetchall()

                    # 重命名旧表
                    cursor.execute("ALTER TABLE system_config RENAME TO system_config_old")
                    conn.commit()

                    # 现在执行完整 schema，它会创建新的 system_config 表
                    conn.close()

                    with open(schema_path, "r", encoding="utf-8") as f:
                        schema = f.read()

                    conn = sqlite3.connect(str(db_path))
                    conn.executescript(schema)
                    conn.commit()

                    # 获取所有组织
                    cursor = conn.cursor()
                    cursor.execute("SELECT id FROM organizations")
                    organizations = cursor.fetchall()

                    now = datetime.now(timezone.utc).isoformat()

                    # 为每个组织复制配置
                    if organizations:
                        print(f"为 {len(organizations)} 个组织迁移配置...")
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
                        print("没有组织，保留配置为全局...")
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

                    conn.commit()
                    print("system_config 表迁移成功！")
                    conn.close()
                    return
                except Exception as e:
                    print(f"迁移失败: {e}")
                    conn.close()
                    raise
        conn.close()

    # 正常执行初始化
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()

    with sqlite3.connect(str(db_path)) as conn:
        conn.executescript(schema)


def dict_factory(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for key in d:
        if key in ["keywords"] and d[key]:
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d
