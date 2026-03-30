import secrets
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ..core.database import get_db_connection
from ..core.auth import get_current_user, require_admin, hash_password
from ..models.schemas import User, UserCreate, UserUpdate, SessionData, UserWithOrganization, Organization

router = APIRouter(prefix="/api/users", tags=["users"])


def generate_id() -> str:
    return secrets.token_urlsafe(16)


def dict_to_user(user_dict: dict, native_organization_id: str = None) -> User:
    """将字典转换为User对象"""
    created_at = datetime.fromisoformat(user_dict["created_at"])
    updated_at = datetime.fromisoformat(user_dict["updated_at"])
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return User(
        id=user_dict["id"],
        email=user_dict["email"],
        name=user_dict["name"],
        organization_id=user_dict["organization_id"],
        native_organization_id=native_organization_id or user_dict["organization_id"],
        role=user_dict["role"],
        is_active=bool(user_dict["is_active"]),
        created_at=created_at,
        updated_at=updated_at,
    )


def dict_to_organization(org_dict: dict) -> Organization:
    """将字典转换为Organization对象"""
    created_at = datetime.fromisoformat(org_dict["created_at"])
    updated_at = datetime.fromisoformat(org_dict["updated_at"])
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)
    return Organization(
        id=org_dict["id"],
        name=org_dict["name"],
        slug=org_dict["slug"],
        created_at=created_at,
        updated_at=updated_at,
    )


@router.get("", response_model=List[UserWithOrganization])
def list_users(
    current_user: SessionData = Depends(require_admin),
):
    """获取所有用户（仅管理员）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT u.*, o.name as organization_name, o.slug as organization_slug,
                   o.created_at as org_created_at, o.updated_at as org_updated_at
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            ORDER BY u.created_at DESC
            """
        )
        rows = cursor.fetchall()
        results = []
        for row in rows:
            row_dict = dict(row)
            user = dict_to_user(row_dict, native_organization_id=row_dict["organization_id"])
            org = None
            if row_dict.get("organization_name"):
                org_dict = {
                    "id": row_dict["organization_id"],
                    "name": row_dict["organization_name"],
                    "slug": row_dict["organization_slug"],
                    "created_at": row_dict["org_created_at"],
                    "updated_at": row_dict["org_updated_at"],
                }
                org = dict_to_organization(org_dict)
            results.append(UserWithOrganization(**user.model_dump(), organization=org))
        return results


@router.get("/{user_id}", response_model=User)
def get_user(
    user_id: str,
    current_user: SessionData = Depends(get_current_user),
):
    """获取用户详情"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")

        user_dict = dict(row)
        # 只有管理员或用户本人可以查看
        if (
            user_dict["organization_id"] != current_user["organization_id"]
            and current_user["role"] != "admin"
            and user_id != current_user["user_id"]
        ):
            raise HTTPException(status_code=403, detail="无权查看此用户")

        return dict_to_user(user_dict, native_organization_id=user_dict["organization_id"])


@router.post("", response_model=User)
def create_user(
    user_data: UserCreate,
    current_user: SessionData = Depends(require_admin),
):
    """创建新用户（仅管理员）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 检查邮箱是否已存在
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="该邮箱已被注册")

        # 创建用户
        user_id = generate_id()
        hashed_pw = hash_password(user_data.password)
        now = datetime.now(timezone.utc).isoformat()
        # 如果指定了组织ID则使用，否则使用当前用户的组织
        org_id = user_data.organization_id or current_user["organization_id"]
        cursor.execute(
            """
            INSERT INTO users (id, email, hashed_password, name, organization_id, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                user_data.email,
                hashed_pw,
                user_data.name,
                org_id,
                "user",
                1,
                now,
                now,
            ),
        )

        # 获取新创建的用户
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        row_dict = dict(row)
        return dict_to_user(row_dict, native_organization_id=row_dict["organization_id"])


@router.put("/{user_id}", response_model=User)
def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: SessionData = Depends(get_current_user),
):
    """更新用户信息"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 获取现有用户
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="用户不存在")

        existing_user = dict(row)

        # 只有管理员可以修改组织、角色和激活状态
        if (user_data.organization_id is not None or user_data.role is not None or user_data.is_active is not None) and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="需要管理员权限")

        # 非管理员只能修改自己的信息
        if current_user["role"] != "admin" and user_id != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="只能修改自己的信息")

        # 不能修改自己的组织
        if user_data.organization_id is not None and user_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="不能修改自己的组织")

        # 如果修改组织，检查目标组织是否存在
        if user_data.organization_id is not None:
            cursor.execute("SELECT id FROM organizations WHERE id = ?", (user_data.organization_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="目标组织不存在")

        # 构建更新语句
        updates = []
        params = []
        if user_data.name is not None:
            updates.append("name = ?")
            params.append(user_data.name)
        if user_data.role is not None and current_user["role"] == "admin":
            updates.append("role = ?")
            params.append(user_data.role)
        if user_data.is_active is not None and current_user["role"] == "admin":
            updates.append("is_active = ?")
            params.append(1 if user_data.is_active else 0)
        if user_data.organization_id is not None and current_user["role"] == "admin":
            updates.append("organization_id = ?")
            params.append(user_data.organization_id)
        if user_data.password is not None and current_user["role"] == "admin":
            updates.append("hashed_password = ?")
            params.append(hash_password(user_data.password))

        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now(timezone.utc).isoformat())
            params.append(user_id)

            cursor.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params
            )

        # 获取更新后的用户
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        row_dict = dict(row)
        return dict_to_user(row_dict, native_organization_id=row_dict["organization_id"])


@router.delete("/{user_id}")
def delete_user(
    user_id: str,
    current_user: SessionData = Depends(require_admin),
):
    """删除用户（仅管理员）"""
    if user_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="不能删除自己")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        # 检查用户是否存在
        cursor.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="用户不存在")

        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        return {"message": "用户已删除"}
