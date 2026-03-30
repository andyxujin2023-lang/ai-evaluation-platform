from typing import Dict, Any, Optional
from ..core.database import get_db_connection
from datetime import datetime, timezone
import secrets


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


def get_default_configs() -> Dict[str, Dict[str, str]]:
    """获取默认配置"""
    return {
        'DIFY_API_URL': {'value': 'https://api.dify.ai/v1', 'description': 'Dify API 地址'},
        'DIFY_API_KEY': {'value': '', 'description': 'Dify API 密钥'},
        'TONGYI_API_KEY': {'value': '', 'description': '通义千问 API 密钥'},
        'TONGYI_MODEL': {'value': 'qwen-max', 'description': '通义千问模型名称'},
    }


def generate_id() -> str:
    """生成唯一ID"""
    return secrets.token_urlsafe(16)


class ConfigService:
    def _init_organization_configs(self, organization_id: str):
        """为新组织初始化默认配置"""
        default_configs = get_default_configs()
        now = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            for key, config in default_configs.items():
                config_id = generate_id()
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO system_config
                    (id, organization_id, key, value, description, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (config_id, organization_id, key, config['value'], config['description'], now, now)
                )

    def get_all_configs(self, organization_id: str, mask_secrets: bool = True) -> Dict[str, Any]:
        """获取组织的所有配置"""
        # 先确保组织有配置
        self._init_organization_configs(organization_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT key, value, description FROM system_config WHERE organization_id = ?",
                (organization_id,)
            )
            rows = cursor.fetchall()
            result = {}
            for row in rows:
                key = row["key"]
                value = row["value"]
                if mask_secrets:
                    value = mask_value(key, value)
                result[key] = {"value": value, "description": row["description"]}
            return result

    def get_config(self, organization_id: str, key: str, mask_secret: bool = True) -> Optional[str]:
        """获取组织的特定配置"""
        # 先确保组织有配置
        self._init_organization_configs(organization_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT value FROM system_config WHERE organization_id = ? AND key = ?",
                (organization_id, key)
            )
            row = cursor.fetchone()
            if not row:
                return None
            value = row["value"]
            if mask_secret:
                return mask_value(key, value)
            return value

    def get_real_config(self, organization_id: str, key: str) -> Optional[str]:
        """获取真实的配置值（不掩码），用于内部使用"""
        return self.get_config(organization_id, key, mask_secret=False)

    def update_config(self, organization_id: str, key: str, value: str) -> bool:
        """更新组织的配置"""
        # 先确保组织有配置
        self._init_organization_configs(organization_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now(timezone.utc).isoformat()

            # 如果是星号，不更新（保持原值）
            if is_secret_key(key) and value == '********':
                # 检查是否存在
                cursor.execute(
                    "SELECT id FROM system_config WHERE organization_id = ? AND key = ?",
                    (organization_id, key)
                )
                if cursor.fetchone():
                    # 存在则只更新时间
                    cursor.execute("""
                        UPDATE system_config SET updated_at = ?
                        WHERE organization_id = ? AND key = ?
                    """, (now, organization_id, key))
                    return True

            # 正常更新 - 先检查是否存在
            cursor.execute(
                "SELECT id FROM system_config WHERE organization_id = ? AND key = ?",
                (organization_id, key)
            )
            existing = cursor.fetchone()

            if existing:
                # 更新现有记录
                cursor.execute("""
                    UPDATE system_config
                    SET value = ?, updated_at = ?
                    WHERE organization_id = ? AND key = ?
                """, (value, now, organization_id, key))
            else:
                # 插入新记录
                config_id = generate_id()
                cursor.execute("""
                    INSERT INTO system_config
                    (id, organization_id, key, value, updated_at, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (config_id, organization_id, key, value, now, now))

            return cursor.rowcount > 0

    def update_configs(self, organization_id: str, configs: Dict[str, str]) -> None:
        """批量更新组织的配置"""
        # 先确保组织有配置
        self._init_organization_configs(organization_id)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            now = datetime.now(timezone.utc).isoformat()

            for key, value in configs.items():
                # 如果是星号且已存在，不更新值
                if is_secret_key(key) and value == '********':
                    cursor.execute(
                        "SELECT id FROM system_config WHERE organization_id = ? AND key = ?",
                        (organization_id, key)
                    )
                    if cursor.fetchone():
                        cursor.execute("""
                            UPDATE system_config SET updated_at = ?
                            WHERE organization_id = ? AND key = ?
                        """, (now, organization_id, key))
                        continue

                # 正常更新
                cursor.execute(
                    "SELECT id FROM system_config WHERE organization_id = ? AND key = ?",
                    (organization_id, key)
                )
                existing = cursor.fetchone()

                if existing:
                    cursor.execute("""
                        UPDATE system_config
                        SET value = ?, updated_at = ?
                        WHERE organization_id = ? AND key = ?
                    """, (value, now, organization_id, key))
                else:
                    config_id = generate_id()
                    cursor.execute("""
                        INSERT INTO system_config
                        (id, organization_id, key, value, updated_at, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (config_id, organization_id, key, value, now, now))


config_service = ConfigService()
