from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from pydantic import BaseModel
from ..services.config_service import config_service
from ..core.auth import get_current_user, require_admin
from ..models.schemas import SessionData

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    key: str
    value: str


class BatchConfigUpdate(BaseModel):
    configs: Dict[str, str]


@router.get("", response_model=Dict[str, Any])
def get_configs(current_user: SessionData = Depends(get_current_user)):
    return config_service.get_all_configs(current_user["organization_id"])


@router.get("/{key}")
def get_config(key: str, current_user: SessionData = Depends(get_current_user)):
    value = config_service.get_config(current_user["organization_id"], key)
    if value is None:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"key": key, "value": value}


@router.put("")
def update_config(update: ConfigUpdate, current_user: SessionData = Depends(require_admin)):
    success = config_service.update_config(
        current_user["organization_id"],
        update.key,
        update.value
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update config")
    return {"message": "Config updated successfully"}


@router.post("/batch")
def update_configs_batch(batch_update: BatchConfigUpdate, current_user: SessionData = Depends(require_admin)):
    config_service.update_configs(
        current_user["organization_id"],
        batch_update.configs
    )
    return {"message": "Configs updated successfully"}
