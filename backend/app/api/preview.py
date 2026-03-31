import secrets
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..core.auth import get_current_user
from ..core.config import get_config_with_db
from ..services.dify_service import DifyService
from ..services.scoring_service import ScoringService
from ..models.schemas import ScoringResult

router = APIRouter(prefix="/api/preview", tags=["preview"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None
    images: Optional[List[str]] = None  # base64 encoded images


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str


class AnalysisRequest(BaseModel):
    question: str
    standard_answer: str
    ai_answer: str


# 存储会话历史（内存存储，重启后丢失）
conversation_history: Dict[str, List[ChatMessage]] = {}


def generate_conversation_id() -> str:
    """生成会话ID"""
    return secrets.token_urlsafe(16)


@router.post("/chat", response_model=ChatResponse)
async def preview_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """预览聊天 - 调用Dify智能体接口进行会话测试"""
    # 获取Dify配置
    api_url = get_config_with_db("DIFY_API_URL")
    api_key = get_config_with_db("DIFY_API_KEY")

    if not api_key:
        raise HTTPException(status_code=400, detail="请先配置Dify API密钥")

    # 如果没有提供会话ID，创建新的
    conversation_id = request.conversation_id or generate_conversation_id()

    # 初始化会话历史
    if conversation_id not in conversation_history:
        conversation_history[conversation_id] = []

    try:
        dify_service = DifyService(api_url=api_url, api_key=api_key)

        # 构建查询（如果有图片，需要特殊处理）
        query = request.query
        if request.images:
            # 简单处理：在查询中注明有图片
            query = f"[包含{len(request.images)}张图片] {query}"

        # 调用Dify API
        answer = await dify_service.chat(query, user=f"preview-{current_user['user_id']}")

        # 保存到会话历史
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        conversation_history[conversation_id].append(
            ChatMessage(role="user", content=request.query, timestamp=now)
        )
        conversation_history[conversation_id].append(
            ChatMessage(role="assistant", content=answer, timestamp=now)
        )

        return ChatResponse(
            answer=answer,
            conversation_id=conversation_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用Dify失败: {str(e)}")


@router.post("/analyze", response_model=ScoringResult)
async def analyze_answer(
    request: AnalysisRequest,
    current_user: dict = Depends(get_current_user),
):
    """分析AI回答 - 调用通义千问进行匹配度分析"""
    # 获取通义千问配置
    api_key = get_config_with_db("TONGYI_API_KEY")
    model = get_config_with_db("TONGYI_MODEL") or "qwen-max"

    if not api_key:
        raise HTTPException(status_code=400, detail="请先配置通义千问API密钥")

    try:
        scoring_service = ScoringService(api_key=api_key, model=model)
        result = await scoring_service.score_answer(
            question=request.question,
            standard_answer=request.standard_answer,
            ai_answer=request.ai_answer
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/chat/{conversation_id}", response_model=List[ChatMessage])
def get_conversation_history(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """获取会话历史"""
    if conversation_id not in conversation_history:
        return []
    return conversation_history[conversation_id]


@router.delete("/chat/{conversation_id}")
def clear_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """清除会话历史"""
    if conversation_id in conversation_history:
        del conversation_history[conversation_id]
    return {"message": "会话已清除"}
