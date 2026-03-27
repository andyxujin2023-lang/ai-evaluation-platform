"""
添加系统配置表的迁移脚本
运行：python migrate_add_config.py
"""
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "ai_evaluation.db"

print(f"数据库路径: {db_path}")

if not db_path.exists():
    print("数据库不存在，无需迁移")
    exit(0)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 检查表是否已存在
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='system_config'")
    if cursor.fetchone():
        print("system_config 表已存在")
    else:
        print("创建 system_config 表...")
        cursor.execute("""
            CREATE TABLE system_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("表创建成功")

    # 插入默认配置
    default_configs = [
        ('DIFY_API_URL', 'https://api.dify.ai/v1', 'Dify API 地址'),
        ('DIFY_API_KEY', '', 'Dify API 密钥'),
        ('TONGYI_API_KEY', '', '通义千问 API 密钥'),
        ('TONGYI_MODEL', 'qwen-max', '通义千问模型名称'),
    ]

    for key, value, description in default_configs:
        cursor.execute("SELECT 1 FROM system_config WHERE key = ?", (key,))
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO system_config (key, value, description) VALUES (?, ?, ?)",
                (key, value, description)
            )
            print(f"插入配置: {key}")
        else:
            print(f"配置已存在: {key}")

    conn.commit()
    print("\n迁移完成！")

except Exception as e:
    print(f"迁移失败: {e}")
    conn.rollback()
finally:
    conn.close()
