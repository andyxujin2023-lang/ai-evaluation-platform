from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import FileResponse
from typing import List, Optional
from pydantic import BaseModel
import uuid
import json
import os
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from ..core.database import get_db_connection
from ..core.auth import get_current_user
from ..models.schemas import TestQuestion, TestQuestionCreate, TestQuestionUpdate, MessageResponse, SessionData


class BatchDeleteRequest(BaseModel):
    ids: List[str]


router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.get("", response_model=List[TestQuestion])
def list_questions(
    category: str = None,
    batch_id: str = None,
    current_user: SessionData = Depends(get_current_user),
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM datasets WHERE organization_id = ?"
        params = [current_user["organization_id"]]

        if category:
            query += " AND category = ?"
            params.append(category)
        if batch_id:
            query += " AND batch_id = ?"
            params.append(batch_id)
        elif batch_id == "":
            query += " AND batch_id IS NULL"

        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
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


@router.get("/categories", response_model=List[str])
def list_categories(current_user: SessionData = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT DISTINCT category FROM datasets WHERE organization_id = ?",
            (current_user["organization_id"],),
        )
        rows = cursor.fetchall()
        return [row["category"] for row in rows]


@router.get("/template/download")
def download_excel_template():
    template_path = Path(__file__).parent.parent.parent / "template.xlsx"

    if not template_path.exists():
        df = pd.DataFrame(columns=["问题", "标准答案", "关键词(多个用逗号分隔)", "分类"])
        sample_data = [
            ["如何查看CPU使用率？", "使用top或htop命令查看", "CPU,top,htop", "监控告警"],
            ["如何检查磁盘空间？", "使用df -h命令查看", "磁盘,df,磁盘空间", "监控告警"],
        ]
        df = pd.concat([df, pd.DataFrame(sample_data, columns=df.columns)], ignore_index=True)
        df.to_excel(template_path, index=False)

    return FileResponse(
        path=str(template_path),
        filename="test_questions_template.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.post("/import", response_model=MessageResponse)
def import_questions(
    questions: List[TestQuestionCreate],
    current_user: SessionData = Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()
    imported = 0

    with get_db_connection() as conn:
        cursor = conn.cursor()
        for q in questions:
            question_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO datasets (id, organization_id, batch_id, question, standard_answer, keywords, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    question_id,
                    current_user["organization_id"],
                    q.batch_id,
                    q.question,
                    q.standard_answer,
                    json.dumps(q.keywords, ensure_ascii=False),
                    q.category,
                    now,
                    now,
                ),
            )
            imported += 1

    return MessageResponse(message=f"Successfully imported {imported} questions")


@router.post("/import/excel", response_model=MessageResponse)
async def import_excel(
    file: UploadFile = File(...),
    batch_id: str = None,
    current_user: SessionData = Depends(get_current_user),
):
    temp_path = Path(__file__).parent.parent.parent / f"temp_{uuid.uuid4().hex}.xlsx"

    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        df = pd.read_excel(temp_path)

        required_columns = ["问题", "标准答案", "关键词(多个用逗号分隔)", "分类"]
        for col in required_columns:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"缺少必填列: {col}")

        now = datetime.now(timezone.utc).isoformat()
        imported = 0

        with get_db_connection() as conn:
            cursor = conn.cursor()

            for _, row in df.iterrows():
                question = str(row["问题"]).strip()
                standard_answer = str(row["标准答案"]).strip()
                keywords_str = str(row["关键词(多个用逗号分隔)"]).strip()
                category = str(row["分类"]).strip()

                if not question or question == "nan":
                    continue

                keywords = [k.strip() for k in keywords_str.replace("，", ",").split(",") if k.strip()]

                question_id = str(uuid.uuid4())
                cursor.execute(
                    """
                    INSERT INTO datasets (id, organization_id, batch_id, question, standard_answer, keywords, category, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        question_id,
                        current_user["organization_id"],
                        batch_id,
                        question,
                        standard_answer,
                        json.dumps(keywords, ensure_ascii=False),
                        category,
                        now,
                        now,
                    ),
                )
                imported += 1

        return MessageResponse(message=f"Successfully imported {imported} questions from Excel")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel 解析失败: {str(e)}")
    finally:
        if temp_path.exists():
            try:
                os.remove(temp_path)
            except:
                pass


@router.get("/{question_id}", response_model=TestQuestion)
def get_question(
    question_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM datasets WHERE id = ? AND organization_id = ?",
            (question_id, current_user["organization_id"]),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Question not found")

        data = dict(row)
        try:
            keywords = json.loads(data["keywords"])
        except (json.JSONDecodeError, TypeError):
            keywords = []
        return TestQuestion(
            id=data["id"],
            batch_id=data.get("batch_id"),
            question=data["question"],
            standard_answer=data["standard_answer"],
            keywords=keywords,
            category=data["category"],
        )


@router.post("", response_model=TestQuestion)
def create_question(
    question: TestQuestionCreate, current_user: SessionData = Depends(get_current_user)
):
    question_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO datasets (id, organization_id, batch_id, question, standard_answer, keywords, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                question_id,
                current_user["organization_id"],
                question.batch_id,
                question.question,
                question.standard_answer,
                json.dumps(question.keywords, ensure_ascii=False),
                question.category,
                now,
                now,
            ),
        )

    return TestQuestion(
        id=question_id,
        batch_id=question.batch_id,
        question=question.question,
        standard_answer=question.standard_answer,
        keywords=question.keywords,
        category=question.category,
    )


@router.put("/{question_id}", response_model=TestQuestion)
def update_question(
    question_id: str,
    question: TestQuestionUpdate,
    current_user: SessionData = Depends(get_current_user),
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM datasets WHERE id = ? AND organization_id = ?",
            (question_id, current_user["organization_id"]),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Question not found")

        updates = []
        params = []
        if question.batch_id is not None:
            updates.append("batch_id = ?")
            params.append(question.batch_id)
        if question.question is not None:
            updates.append("question = ?")
            params.append(question.question)
        if question.standard_answer is not None:
            updates.append("standard_answer = ?")
            params.append(question.standard_answer)
        if question.keywords is not None:
            updates.append("keywords = ?")
            params.append(json.dumps(question.keywords, ensure_ascii=False))
        if question.category is not None:
            updates.append("category = ?")
            params.append(question.category)

        if updates:
            updates.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(question_id)
            params.append(current_user["organization_id"])

            cursor.execute(
                f"""
                UPDATE datasets SET {', '.join(updates)} WHERE id = ? AND organization_id = ?
            """,
                params,
            )

    return get_question(question_id, current_user)


@router.delete("/{question_id}", response_model=MessageResponse)
def delete_question(
    question_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM datasets WHERE id = ? AND organization_id = ?",
            (question_id, current_user["organization_id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Question not found")

    return MessageResponse(message="Question deleted successfully")


@router.post("/batch-delete", response_model=MessageResponse)
def batch_delete_questions(
    request: BatchDeleteRequest, current_user: SessionData = Depends(get_current_user)
):
    if not request.ids:
        raise HTTPException(status_code=400, detail="No question IDs provided")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        placeholders = ", ".join(["?"] * len(request.ids))
        # 使用 organization_id 作为额外的安全措施
        placeholders_with_org = ", ".join(["?"] * len(request.ids))
        cursor.execute(
            f"DELETE FROM datasets WHERE id IN ({placeholders}) AND organization_id = ?",
            request.ids + [current_user["organization_id"]],
        )
        deleted_count = cursor.rowcount

    return MessageResponse(message=f"Successfully deleted {deleted_count} questions")
