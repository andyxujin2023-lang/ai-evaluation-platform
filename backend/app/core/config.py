from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DIFY_API_URL: str = "https://api.dify.ai/v1"
    DIFY_API_KEY: str = ""
    TONGYI_API_KEY: str = ""
    TONGYI_MODEL: str = "qwen-max"
    DATABASE_URL: str = "sqlite:///./ai_evaluation.db"
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()


def get_config_with_db(key: str, default: str = "") -> str:
    """
    优先从数据库获取配置，如果数据库没有则从环境变量获取
    注意：此函数返回真实配置值（不掩码），仅供内部服务使用
    """
    try:
        from ..services.config_service import config_service
        value = config_service.get_real_config(key)
        if value is not None:
            return value
    except Exception:
        pass

    settings = get_settings()
    return getattr(settings, key, default)

