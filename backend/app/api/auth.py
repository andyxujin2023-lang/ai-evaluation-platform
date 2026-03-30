import secrets
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from datetime import datetime, timezone
from ..core.database import get_db_connection
from ..core.auth import (
    hash_password,
    verify_password,
    create_session,
    set_session_cookie,
    delete_session_cookie,
    invalidate_session,
    switch_organization_in_session,
    get_current_user,
    get_session_from_cookie,
)
from ..models.schemas import (
    User,
    UserCreate,
    UserLogin,
    AuthResponse,
    SessionData,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# 默认组织配置
DEFAULT_ORG_ID = "default-org"
DEFAULT_ORG_NAME = "默认组织"
DEFAULT_ORG_SLUG = "default"

# 默认管理员账户配置
DEFAULT_ADMIN_EMAIL = "admin@example.com"
DEFAULT_ADMIN_NAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"


def generate_id() -> str:
    """生成唯一ID"""
    return secrets.token_urlsafe(16)


def get_or_create_default_organization() -> str:
    """获取或创建默认组织，返回组织ID"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 检查默认组织是否存在
        cursor.execute("SELECT id FROM organizations WHERE id = ?", (DEFAULT_ORG_ID,))
        row = cursor.fetchone()
        if row:
            return DEFAULT_ORG_ID

        # 创建默认组织
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO organizations (id, name, slug, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, now, now),
        )
        return DEFAULT_ORG_ID


def get_or_create_default_admin(organization_id: str) -> dict:
    """获取或创建默认管理员账户"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 检查默认管理员是否存在
        cursor.execute("SELECT * FROM users WHERE email = ?", (DEFAULT_ADMIN_EMAIL,))
        row = cursor.fetchone()
        if row:
            return dict(row)

        # 创建默认管理员
        user_id = generate_id()
        hashed_pw = hash_password(DEFAULT_ADMIN_PASSWORD)
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            INSERT INTO users (id, email, hashed_password, name, organization_id, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                DEFAULT_ADMIN_EMAIL,
                hashed_pw,
                DEFAULT_ADMIN_NAME,
                organization_id,
                "admin",
                1,
                now,
                now,
            ),
        )
        return {
            "id": user_id,
            "email": DEFAULT_ADMIN_EMAIL,
            "name": DEFAULT_ADMIN_NAME,
            "organization_id": organization_id,
            "role": "admin",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }


def get_user_by_email(email: str) -> dict:
    """通过邮箱获取用户"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_name(name: str) -> dict:
    """通过用户名获取用户"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_user(
    email: str, password: str, name: str, organization_id: str, role: str = "user"
) -> dict:
    """创建用户"""
    user_id = generate_id()
    hashed_pw = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO users (id, email, hashed_password, name, organization_id, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                email,
                hashed_pw,
                name,
                organization_id,
                role,
                1,
                now,
                now,
            ),
        )
    return {
        "id": user_id,
        "email": email,
        "name": name,
        "organization_id": organization_id,
        "role": role,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }


def dict_to_user(user_dict: dict, native_organization_id: str = None) -> User:
    """将字典转换为User对象"""
    return User(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        organization_id=user_dict["organization_id"],
        native_organization_id=native_organization_id or user_dict["organization_id"],
        role=user_dict["role"],
        is_active=bool(user_dict["is_active"]),
        created_at=datetime.fromisoformat(user_dict["created_at"]),
        updated_at=datetime.fromisoformat(user_dict["updated_at"]),
    )


@router.post("/register", response_model=AuthResponse)
def register(user_data: UserCreate, response: Response):
    """用户注册 - 新用户自动加入默认组织，角色为普通用户"""
    # 确保默认组织存在
    org_id = get_or_create_default_organization()
    # 确保默认管理员存在
    get_or_create_default_admin(org_id)

    # 检查用户是否已存在
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    # 创建用户，固定为普通用户角色
    user_dict = create_user(
        user_data.email, user_data.password, user_data.name, org_id, "user"
    )

    # 创建会话并设置cookie
    session_token, expires_at = create_session(user_dict["id"])
    set_session_cookie(response, session_token, expires_at)

    return AuthResponse(
        user=dict_to_user(user_dict, native_organization_id=user_dict["organization_id"]),
        message="注册成功",
    )


@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, response: Response):
    """用户登录 - 支持邮箱或用户名登录"""
    # 确保默认组织和管理员存在（首次启动时初始化）
    try:
        org_id = get_or_create_default_organization()
        get_or_create_default_admin(org_id)
    except Exception:
        pass  # 如果数据库还没初始化，忽略错误

    # 先尝试用邮箱查找，再尝试用用户名查找
    user_dict = get_user_by_email(credentials.account)
    if not user_dict:
        user_dict = get_user_by_name(credentials.account)

    if not user_dict:
        raise HTTPException(status_code=401, detail="账户或密码错误")

    if not bool(user_dict["is_active"]):
        raise HTTPException(status_code=403, detail="账户已被禁用")

    if not verify_password(credentials.password, user_dict["hashed_password"]):
        raise HTTPException(status_code=401, detail="账户或密码错误")

    # 创建会话并设置cookie
    session_token, expires_at = create_session(user_dict["id"])
    set_session_cookie(response, session_token, expires_at)

    return AuthResponse(
        user=dict_to_user(user_dict, native_organization_id=user_dict["organization_id"]),
        message="登录成功",
    )


@router.post("/logout")
def logout(request: Request, response: Response):
    """用户登出"""
    session_token = request.cookies.get("session_id")
    if session_token:
        invalidate_session(session_token)
    delete_session_cookie(response)
    return {"message": "登出成功"}


@router.get("/me", response_model=User)
def get_me(current_user: SessionData = Depends(get_current_user)):
    """获取当前用户信息"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (current_user["user_id"],))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")
        user_dict = dict(row)
        # 获取用户的原生组织ID
        native_org_id = user_dict["organization_id"]
        # 使用当前会话中的组织ID
        user_dict["organization_id"] = current_user["organization_id"]
        return dict_to_user(user_dict, native_organization_id=native_org_id)


@router.post("/switch-organization/{org_id}")
def switch_organization(
    org_id: str,
    request: Request,
    current_user: SessionData = Depends(get_current_user),
):
    """切换到指定组织（仅管理员）"""
    # 只有管理员可以切换组织
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="只有管理员可以切换组织")

    # 如果org_id是"reset"，则重置到用户的原生组织
    target_org_id = None if org_id == "reset" else org_id

    if target_org_id:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # 检查目标组织是否存在
            cursor.execute("SELECT * FROM organizations WHERE id = ?", (target_org_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="组织不存在")

    # 获取当前会话token
    session_token = request.cookies.get("session_id")
    if not session_token:
        raise HTTPException(status_code=401, detail="未登录")

    # 更新会话中的组织ID
    switch_organization_in_session(session_token, target_org_id)

    return {"message": "切换组织成功"}
