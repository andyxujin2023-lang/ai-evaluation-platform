from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
import json
from datetime import datetime, timezone
from ..core.database import get_db_connection
from ..core.auth import get_current_user
from ..models.schemas import TestBatch, TestBatchCreate, TestBatchUpdate, MessageResponse, TestQuestion, SessionData

router = APIRouter(prefix="/api/test-batches", tags=["test-batches"])


@router.get("", response_model=List[TestBatch])
def list_batches(current_user: SessionData = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_batches WHERE organization_id = ? ORDER BY created_at DESC",
            (current_user["organization_id"],),
        )
        rows = cursor.fetchall()

        batches = []
        for row in rows:
            data = dict(row)
            batches.append(
                TestBatch(
                    id=data["id"],
                    organization_id=data.get("organization_id"),
                    name=data["name"],
                    description=data.get("description"),
                    created_at=datetime.fromisoformat(data["created_at"]),
                    updated_at=datetime.fromisoformat(data["updated_at"]),
                )
            )
        return batches


@router.get("/{batch_id}", response_model=TestBatch)
def get_batch(
    batch_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_batches WHERE id = ? AND organization_id = ?",
            (batch_id, current_user["organization_id"]),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Batch not found")

        data = dict(row)
        return TestBatch(
            id=data["id"],
            organization_id=data.get("organization_id"),
            name=data["name"],
            description=data.get("description"),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
        )


@router.post("", response_model=TestBatch)
def create_batch(
    batch: TestBatchCreate, current_user: SessionData = Depends(get_current_user)
):
    batch_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO test_batches (id, organization_id, name, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                batch_id,
                current_user["organization_id"],
                batch.name,
                batch.description,
                now,
                now,
            ),
        )

    return get_batch(batch_id, current_user)


@router.put("/{batch_id}", response_model=TestBatch)
def update_batch(
    batch_id: str,
    batch: TestBatchUpdate,
    current_user: SessionData = Depends(get_current_user),
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_batches WHERE id = ? AND organization_id = ?",
            (batch_id, current_user["organization_id"]),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Batch not found")

        updates = []
        params = []
        if batch.name is not None:
            updates.append("name = ?")
            params.append(batch.name)
        if batch.description is not None:
            updates.append("description = ?")
            params.append(batch.description)

        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(batch_id)
            params.append(current_user["organization_id"])

            cursor.execute(
                f"""
                UPDATE test_batches SET {', '.join(updates)} WHERE id = ? AND organization_id = ?
            """,
                params,
            )

    return get_batch(batch_id, current_user)


@router.get("/{batch_id}/questions", response_model=List[TestQuestion])
def get_batch_questions(
    batch_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM datasets WHERE batch_id = ? AND organization_id = ? ORDER BY created_at DESC",
            (batch_id, current_user["organization_id"]),
        )
        rows = cursor.fetchall()

        questions = []
        for row in rows:
            data = dict(row)
            try:
                keywords = json.loads(data["keywords"])
            except (json.JSONDecodeError, TypeError):
                keywords = []
            questions.append(
                TestQuestion(
                    id=data["id"],
                    batch_id=data.get("batch_id"),
                    question=data["question"],
                    standard_answer=data["standard_answer"],
                    keywords=keywords,
                    category=data["category"],
                )
            )
        return questions


@router.get("/{batch_id}/stats")
def get_batch_stats(
    batch_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) as count FROM datasets WHERE batch_id = ? AND organization_id = ?",
            (batch_id, current_user["organization_id"]),
        )
        question_count = cursor.fetchone()["count"]

        cursor.execute(
            "SELECT COUNT(*) as count FROM test_runs WHERE batch_id = ? AND organization_id = ?",
            (batch_id, current_user["organization_id"]),
        )
        test_run_count = cursor.fetchone()["count"]

        return {
            "question_count": question_count,
            "test_run_count": test_run_count,
        }


@router.delete("/{batch_id}", response_model=MessageResponse)
def delete_batch(
    batch_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM test_batches WHERE id = ? AND organization_id = ?",
            (batch_id, current_user["organization_id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Batch not found")

    return MessageResponse(message="Batch deleted successfully")
