import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from fastapi import Request, HTTPException, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .database import get_db_connection

# 会话过期时间：7天
SESSION_EXPIRE_DAYS = 7
SESSION_COOKIE_NAME = "session_id"

# HTTP Bearer 安全方案（用于 Swagger UI）
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """哈希密码"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def generate_session_token() -> str:
    """生成安全的会话令牌"""
    return secrets.token_urlsafe(64)


def create_session(user_id: str) -> Tuple[str, datetime]:
    """创建新会话，返回 (session_token, expires_at)"""
    session_token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRE_DAYS)
    session_id = secrets.token_urlsafe(16)

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sessions (id, user_id, session_token, expires_at, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (session_id, user_id, session_token, expires_at.isoformat(), datetime.now(timezone.utc).isoformat()),
        )

    return session_token, expires_at


def get_session_from_cookie(request: Request) -> Optional[dict]:
    """从 Cookie 中获取会话"""
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        return None

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT s.user_id, s.expires_at, s.switch_organization_id,
                   u.organization_id as user_organization_id, u.role, u.email, u.name
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND u.is_active = 1
            """,
            (session_token,),
        )
        row = cursor.fetchone()

        if not row:
            return None

        expires_at = datetime.fromisoformat(row["expires_at"])
        # 确保 expires_at 是 offset-aware
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            # 会话已过期，删除它
            cursor.execute(
                "DELETE FROM sessions WHERE session_token = ?", (session_token,)
            )
            return None

        # 使用切换的组织ID，如果没有则使用用户的原生组织ID
        effective_org_id = row["switch_organization_id"] or row["user_organization_id"]

        return {
            "user_id": row["user_id"],
            "organization_id": effective_org_id,
            "role": row["role"],
            "email": row["email"],
            "name": row["name"],
        }


def set_session_cookie(response: Response, session_token: str, expires_at: datetime):
    """设置会话 Cookie"""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        samesite="lax",
        expires=expires_at,
        path="/",
    )


def delete_session_cookie(response: Response):
    """删除会话 Cookie"""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")


def invalidate_session(session_token: str):
    """使会话失效"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM sessions WHERE session_token = ?", (session_token,))


def switch_organization_in_session(session_token: str, org_id: Optional[str]):
    """在会话中切换组织"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE sessions SET switch_organization_id = ? WHERE session_token = ?",
            (org_id, session_token),
        )


async def get_current_user(
    request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """获取当前用户（FastAPI 依赖）"""
    # 优先从 Cookie 获取
    session = get_session_from_cookie(request)
    if session:
        return session

    # 也可以从 Authorization header 获取（用于 Swagger UI）
    if credentials:
        # 这里可以添加 Bearer token 支持
        pass

    raise HTTPException(status_code=401, detail="未登录或登录已过期")


async def get_current_user_optional(
    request: Request,
) -> Optional[dict]:
    """获取当前用户（可选，如果未登录返回 None）"""
    return get_session_from_cookie(request)


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """要求管理员权限（FastAPI 依赖）"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return current_user
