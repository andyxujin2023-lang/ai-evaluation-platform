import secrets
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from ..core.database import get_db_connection
from ..core.auth import get_current_user, require_admin
from ..models.schemas import Organization, OrganizationCreate, SessionData

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def generate_id() -> str:
    return secrets.token_urlsafe(16)


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


@router.get("", response_model=List[Organization])
def list_organizations(
    current_user: SessionData = Depends(require_admin),
):
    """获取所有组织列表（仅超级管理员，这里简化为管理员可看）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM organizations ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
        return [dict_to_organization(dict(row)) for row in rows]


@router.get("/my", response_model=Organization)
def get_my_organization(
    current_user: SessionData = Depends(get_current_user),
):
    """获取当前用户所属的组织"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM organizations WHERE id = ?",
            (current_user["organization_id"],),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Organization not found")
        return dict_to_organization(dict(row))


@router.get("/{org_id}", response_model=Organization)
def get_organization(
    org_id: str,
    current_user: SessionData = Depends(get_current_user),
):
    """获取组织详情"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM organizations WHERE id = ?",
            (org_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Organization not found")

        org = dict(row)
        # 只有管理员或本组织用户可以查看
        if org["id"] != current_user["organization_id"] and current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="无权查看此组织")

        return dict_to_organization(org)


@router.post("", response_model=Organization)
def create_organization(
    org_data: OrganizationCreate,
    current_user: SessionData = Depends(require_admin),
):
    """创建新组织（仅管理员）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 检查slug是否已存在
        cursor.execute("SELECT id FROM organizations WHERE slug = ?", (org_data.slug,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="组织标识已被使用")

        # 检查name是否已存在
        cursor.execute("SELECT id FROM organizations WHERE name = ?", (org_data.name,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="组织名称已被使用")

        org_id = generate_id()
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            INSERT INTO organizations (id, name, slug, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (org_id, org_data.name, org_data.slug, now, now),
        )

    return get_organization(org_id, current_user)


@router.put("/{org_id}", response_model=Organization)
def update_organization(
    org_id: str,
    org_data: OrganizationCreate,
    current_user: SessionData = Depends(require_admin),
):
    """更新组织信息（仅管理员）"""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 检查组织是否存在
        cursor.execute("SELECT * FROM organizations WHERE id = ?", (org_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Organization not found")

        # 检查slug是否与其他组织冲突
        cursor.execute(
            "SELECT id FROM organizations WHERE slug = ? AND id != ?",
            (org_data.slug, org_id),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="组织标识已被使用")

        # 检查name是否与其他组织冲突
        cursor.execute(
            "SELECT id FROM organizations WHERE name = ? AND id != ?",
            (org_data.name, org_id),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="组织名称已被使用")

        now = datetime.now(timezone.utc).isoformat()

        cursor.execute(
            """
            UPDATE organizations
            SET name = ?, slug = ?, updated_at = ?
            WHERE id = ?
            """,
            (org_data.name, org_data.slug, now, org_id),
        )

    return get_organization(org_id, current_user)


@router.delete("/{org_id}")
def delete_organization(
    org_id: str,
    current_user: SessionData = Depends(require_admin),
):
    """删除组织（仅管理员）"""
    # 不能删除自己所属的组织
    if org_id == current_user["organization_id"]:
        raise HTTPException(status_code=400, detail="不能删除自己所属的组织")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM organizations WHERE id = ?", (org_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Organization not found")

    return {"message": "Organization deleted successfully"}
