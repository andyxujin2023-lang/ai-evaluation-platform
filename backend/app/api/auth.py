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


def generate_id() -> str:
    """生成唯一ID"""
    return secrets.token_urlsafe(16)


def get_user_by_email(email: str) -> dict:
    """通过邮箱获取用户"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_organization(name: str, slug: str) -> str:
    """创建组织，返回组织ID"""
    org_id = generate_id()
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO organizations (id, name, slug, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (org_id, name, slug, now, now),
        )
    return org_id


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
    """用户注册"""
    # 检查用户是否已存在
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    organization_id = user_data.organization_id

    # 如果没有提供组织ID，创建新组织
    if not organization_id:
        if not user_data.organization_name or not user_data.organization_slug:
            raise HTTPException(
                status_code=400, detail="请提供组织名称和标识"
            )
        # 检查组织slug是否已存在
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id FROM organizations WHERE slug = ?", (user_data.organization_slug,)
            )
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="组织标识已被使用")
        organization_id = create_organization(
            user_data.organization_name, user_data.organization_slug
        )
        # 新组织的第一个用户是管理员
        role = "admin"
    else:
        # 加入现有组织，默认是普通用户
        role = "user"

    # 创建用户
    user_dict = create_user(
        user_data.email, user_data.password, user_data.name, organization_id, role
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
    """用户登录"""
    user_dict = get_user_by_email(credentials.email)
    if not user_dict:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if not bool(user_dict["is_active"]):
        raise HTTPException(status_code=403, detail="账户已被禁用")

    if not verify_password(credentials.password, user_dict["hashed_password"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

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
