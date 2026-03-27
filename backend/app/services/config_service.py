from typing import Dict, Any, Optional
from ..core.database import get_db_connection
from datetime import datetime


def is_secret_key(key: str) -> bool:
    """判断是否为密钥类型的配置"""
    return 'KEY' in key or 'SECRET' in key or 'PASSWORD' in key


def mask_value(key: str, value: str) -> str:
    """对密钥值进行掩码处理"""
    if not is_secret_key(key):
        return value
    if not value:
        return ''
    # 显示为固定长度的星号
    return '********'


class ConfigService:
    def get_all_configs(self, mask_secrets: bool = True) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value, description FROM system_config")
            rows = cursor.fetchall()
            result = {}
            for row in rows:
                key = row["key"]
                value = row["value"]
                if mask_secrets:
                    value = mask_value(key, value)
                result[key] = {"value": value, "description": row["description"]}
            return result

    def get_config(self, key: str, mask_secret: bool = True) -> Optional[str]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
            row = cursor.fetchone()
            if not row:
                return None
            value = row["value"]
            if mask_secret:
                return mask_value(key, value)
            return value

    def get_real_config(self, key: str) -> Optional[str]:
        """获取真实的配置值（不掩码），用于内部使用"""
        return self.get_config(key, mask_secret=False)

    def update_config(self, key: str, value: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # 如果是星号，不更新（保持原值）
            if is_secret_key(key) and value == '********':
                # 检查是否存在
                cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
                if cursor.fetchone():
                    # 存在则只更新时间
                    cursor.execute("""
                        UPDATE system_config SET updated_at = ? WHERE key = ?
                    """, (datetime.now().isoformat(), key))
                    return True
            # 正常更新
            cursor.execute("""
                INSERT OR REPLACE INTO system_config (key, value, updated_at)
                VALUES (?, ?, ?)
            """, (key, value, datetime.now().isoformat()))
            return cursor.rowcount > 0

    def update_configs(self, configs: Dict[str, str]) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            for key, value in configs.items():
                # 如果是星号且已存在，不更新值
                if is_secret_key(key) and value == '********':
                    cursor.execute("SELECT value FROM system_config WHERE key = ?", (key,))
                    if cursor.fetchone():
                        cursor.execute("""
                            UPDATE system_config SET updated_at = ? WHERE key = ?
                        """, (now, key))
                        continue
                # 正常更新
                cursor.execute("""
                    INSERT OR REPLACE INTO system_config (key, value, updated_at)
                    VALUES (?, ?, ?)
                """, (key, value, now))


config_service = ConfigService()
