"""
数据库迁移脚本 - 为 sessions 表添加 switch_organization_id 列
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

    print("开始迁移 sessions 表...")

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # 检查是否已经迁移过
        cursor.execute("PRAGMA table_info(sessions)")
        columns = [col[1] for col in cursor.fetchall()]

        if "switch_organization_id" in columns:
            print("sessions 表已经迁移过了")
            return

        # 开始事务
        conn.execute("BEGIN TRANSACTION")

        # 添加 switch_organization_id 列
        print("添加 switch_organization_id 列...")
        cursor.execute(
            "ALTER TABLE sessions ADD COLUMN switch_organization_id TEXT"
        )

        # 提交事务
        conn.commit()
        print("\nsessions 表迁移成功！")

    except Exception as e:
        conn.rollback()
        print(f"\n迁移失败: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
