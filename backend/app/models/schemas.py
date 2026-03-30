from pydantic import BaseModel, EmailStr, field_serializer
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


# ========== 组织相关模型 ==========
class Organization(BaseModel):
    id: str
    name: str
    slug: str
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class OrganizationCreate(BaseModel):
    name: str
    slug: str


# ========== 用户相关模型 ==========
class User(BaseModel):
    id: str
    email: str
    name: str
    organization_id: str
    native_organization_id: str
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    organization_slug: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    organization_id: Optional[str] = None


class UserWithOrganization(User):
    organization: Optional[Organization] = None


# ========== 会话数据模型 ==========
class SessionData(BaseModel):
    user_id: str
    organization_id: str
    role: str
    email: str
    name: str


class AuthResponse(BaseModel):
    user: User
    message: str


# ========== 原有测试相关模型 ==========
class TestBatch(BaseModel):
    id: str
    organization_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class TestBatchCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TestBatchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TestQuestion(BaseModel):
    id: str
    batch_id: Optional[str] = None
    question: str
    standard_answer: str
    keywords: List[str]
    category: str


class TestQuestionCreate(BaseModel):
    batch_id: Optional[str] = None
    question: str
    standard_answer: str
    keywords: List[str]
    category: str


class TestQuestionUpdate(BaseModel):
    batch_id: Optional[str] = None
    question: Optional[str] = None
    standard_answer: Optional[str] = None
    keywords: Optional[List[str]] = None
    category: Optional[str] = None


class ScoringResult(BaseModel):
    accuracy: float
    completeness: float
    actionability: float
    consistency: float
    issues: str
    total_score: float


class TestResult(BaseModel):
    id: str
    test_run_id: str
    question_id: str
    question: str
    standard_answer: str
    ai_answer: Optional[str] = None
    accuracy: Optional[float] = None
    completeness: Optional[float] = None
    actionability: Optional[float] = None
    consistency: Optional[float] = None
    total_score: Optional[float] = None
    issues: Optional[str] = None
    category: str
    error_message: Optional[str] = None
    created_at: datetime

    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime):
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class TestRun(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    batch_id: Optional[str] = None
    status: str
    total_questions: int = 0
    completed_questions: int = 0
    average_score: Optional[float] = None
    hallucination_rate: Optional[float] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    @field_serializer('created_at', 'started_at', 'completed_at')
    def serialize_datetime(self, dt: Optional[datetime]):
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class TestRunCreate(BaseModel):
    name: str
    description: Optional[str] = None
    batch_id: Optional[str] = None


class TestReportOverview(BaseModel):
    test_run: TestRun
    average_score: float
    dimension_scores: Dict[str, float]
    hallucination_rate: float
    category_stats: Dict[str, float]
    total_tests: int


class TestReportDetail(BaseModel):
    overview: TestReportOverview
    results: List[TestResult]


class VersionComparison(BaseModel):
    base_run: TestRun
    compare_run: TestRun
    score_change: float
    category_changes: Dict[str, float]
    low_score_questions: List[Dict[str, Any]]


class TestProgress(BaseModel):
    test_run_id: str
    status: str
    completed: int
    total: int
    percentage: float


class DifyConfig(BaseModel):
    api_url: str
    api_key: str


class MessageResponse(BaseModel):
    message: str
