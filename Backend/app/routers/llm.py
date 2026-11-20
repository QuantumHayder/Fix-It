from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.llm import client as llm_client
from app.models.user import User
from app.routers.dependencies import get_current_user
from app.schemas.llm import (
    LLMCallDetail,
    LLMUsageResponse,
    ModelsResponse,
    SummarizeRequest,
    SummarizeResponse,
)
from app.services import llm_service

router = APIRouter(tags=["llm"])


@router.get("/llm/models", response_model=ModelsResponse)
def list_models(current_user: User = Depends(get_current_user)):
    return {"default_model": settings.OLLAMA_MODEL, "models": llm_client.list_models()}


@router.post("/snapshots/{snapshot_id}/summarize", response_model=SummarizeResponse)
def summarize(
    snapshot_id: int,
    data: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return llm_service.summarize_scope(db, current_user, snapshot_id, data.model)


@router.get("/snapshots/{snapshot_id}/llm-calls", response_model=LLMUsageResponse)
def get_usage(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return llm_service.get_usage(db, current_user, snapshot_id)


@router.get("/llm-calls/{call_id}", response_model=LLMCallDetail)
def get_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return llm_service.get_call(db, current_user, call_id)
