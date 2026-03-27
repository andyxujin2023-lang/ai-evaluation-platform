from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from pydantic import BaseModel
from ..services.config_service import config_service

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    key: str
    value: str


class BatchConfigUpdate(BaseModel):
    configs: Dict[str, str]


@router.get("", response_model=Dict[str, Any])
def get_configs():
    return config_service.get_all_configs()


@router.get("/{key}")
def get_config(key: str):
    value = config_service.get_config(key)
    if value is None:
        raise HTTPException(status_code=404, detail="Config not found")
    return {"key": key, "value": value}


@router.put("")
def update_config(update: ConfigUpdate):
    success = config_service.update_config(update.key, update.value)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update config")
    return {"message": "Config updated successfully"}


@router.post("/batch")
def update_configs_batch(batch_update: BatchConfigUpdate):
    config_service.update_configs(batch_update.configs)
    return {"message": "Configs updated successfully"}
