from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import uuid
import os
from ..core.database import get_db_connection
from ..core.auth import get_current_user
from ..models.schemas import (
    TestRun,
    TestRunCreate,
    TestResult,
    TestReportOverview,
    TestReportDetail,
    VersionComparison,
    TestProgress,
    MessageResponse,
    SessionData,
)
from ..services.test_engine import test_engine

router = APIRouter(prefix="/api/test-runs", tags=["test-runs"])


@router.get("", response_model=List[TestRun])
def list_test_runs(current_user: SessionData = Depends(get_current_user)):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_runs WHERE organization_id = ? ORDER BY created_at DESC",
            (current_user["organization_id"],),
        )
        rows = cursor.fetchall()

        test_runs = []
        for row in rows:
            data = dict(row)
            test_runs.append(
                TestRun(
                    id=data["id"],
                    name=data["name"],
                    description=data.get("description"),
                    batch_id=data.get("batch_id"),
                    status=data["status"],
                    total_questions=data.get("total_questions", 0),
                    completed_questions=data.get("completed_questions", 0),
                    average_score=data.get("average_score"),
                    hallucination_rate=data.get("hallucination_rate"),
                    started_at=datetime.fromisoformat(data["started_at"])
                    if data.get("started_at")
                    else None,
                    completed_at=datetime.fromisoformat(data["completed_at"])
                    if data.get("completed_at")
                    else None,
                    created_at=datetime.fromisoformat(data["created_at"]),
                )
            )
        return test_runs


@router.post("", response_model=TestRun)
async def start_test_run(
    test_run: TestRunCreate, current_user: SessionData = Depends(get_current_user)
):
    test_run_id = await test_engine.start_test_run(
        test_run.name,
        test_run.description,
        test_run.batch_id,
        current_user["organization_id"],
    )
    return get_test_run(test_run_id, current_user)


@router.get("/{test_run_id}/progress", response_model=TestProgress)
def get_test_progress(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    progress = test_engine.get_test_progress(test_run_id)
    if progress:
        return TestProgress(
            test_run_id=test_run_id,
            status=progress["status"],
            completed=progress["completed"],
            total=progress["total"],
            percentage=(progress["completed"] / progress["total"] * 100)
            if progress["total"] > 0
            else 0,
        )

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_runs WHERE id = ? AND organization_id = ?",
            (test_run_id, current_user["organization_id"]),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Test run not found")

        data = dict(row)
        total = data.get("total_questions", 0)
        completed = data.get("completed_questions", 0)
        return TestProgress(
            test_run_id=test_run_id,
            status=data["status"],
            completed=completed,
            total=total,
            percentage=(completed / total * 100) if total > 0 else 0,
        )


@router.get("/{test_run_id}/results", response_model=List[TestResult])
def get_test_results(
    test_run_id: str,
    category: str = None,
    current_user: SessionData = Depends(get_current_user),
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        if category:
            cursor.execute(
                "SELECT * FROM test_results WHERE test_run_id = ? AND category = ? AND organization_id = ?",
                (test_run_id, category, current_user["organization_id"]),
            )
        else:
            cursor.execute(
                "SELECT * FROM test_results WHERE test_run_id = ? AND organization_id = ?",
                (test_run_id, current_user["organization_id"]),
            )
        rows = cursor.fetchall()

        results = []
        for row in rows:
            data = dict(row)
            results.append(
                TestResult(
                    id=data["id"],
                    test_run_id=data["test_run_id"],
                    question_id=data["question_id"],
                    question=data["question"],
                    standard_answer=data["standard_answer"],
                    ai_answer=data.get("ai_answer"),
                    accuracy=data.get("accuracy"),
                    completeness=data.get("completeness"),
                    actionability=data.get("actionability"),
                    consistency=data.get("consistency"),
                    total_score=data.get("total_score"),
                    issues=data.get("issues"),
                    category=data["category"],
                    error_message=data.get("error_message"),
                    created_at=datetime.fromisoformat(data["created_at"]),
                )
            )
        return results


@router.get("/{test_run_id}/report", response_model=TestReportDetail)
def get_test_report(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    test_run = get_test_run(test_run_id, current_user)
    results = get_test_results(test_run_id, current_user=current_user)

    total_tests = len(results)
    if total_tests == 0:
        raise HTTPException(status_code=404, detail="No test results found")

    avg_score = sum(r.total_score or 0 for r in results) / total_tests
    avg_accuracy = sum(r.accuracy or 0 for r in results) / total_tests
    avg_completeness = sum(r.completeness or 0 for r in results) / total_tests
    avg_actionability = sum(r.actionability or 0 for r in results) / total_tests
    avg_consistency = sum(r.consistency or 0 for r in results) / total_tests

    low_score_count = sum(1 for r in results if (r.total_score or 0) < 60)
    hallucination_rate = (low_score_count / total_tests) * 100

    category_stats: Dict[str, Dict[str, Any]] = {}
    for r in results:
        if r.category not in category_stats:
            category_stats[r.category] = {"sum": 0, "count": 0}
        category_stats[r.category]["sum"] += r.total_score or 0
        category_stats[r.category]["count"] += 1

    category_averages = {
        cat: stats["sum"] / stats["count"] for cat, stats in category_stats.items()
    }

    overview = TestReportOverview(
        test_run=test_run,
        average_score=avg_score,
        dimension_scores={
            "accuracy": avg_accuracy,
            "completeness": avg_completeness,
            "actionability": avg_actionability,
            "consistency": avg_consistency,
        },
        hallucination_rate=hallucination_rate,
        category_stats=category_averages,
        total_tests=total_tests,
    )

    return TestReportDetail(overview=overview, results=results)


@router.get("/{test_run_id}/export/excel")
def export_test_results_excel(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    test_run = get_test_run(test_run_id, current_user)
    results = get_test_results(test_run_id, current_user=current_user)

    if not results:
        raise HTTPException(status_code=404, detail="No test results found")

    export_path = Path(__file__).parent.parent.parent / f"export_{uuid.uuid4().hex}.xlsx"

    try:
        data = []
        for r in results:
            data.append(
                {
                    "问题ID": r.question_id,
                    "问题": r.question,
                    "标准答案": r.standard_answer,
                    "AI回答": r.ai_answer or "",
                    "分类": r.category,
                    "准确性": r.accuracy or 0,
                    "完整性": r.completeness or 0,
                    "可操作性": r.actionability or 0,
                    "一致性": r.consistency or 0,
                    "总分": r.total_score or 0,
                    "问题描述": r.issues or "",
                    "错误信息": r.error_message or "",
                    "创建时间": r.created_at.isoformat(),
                }
            )

        df = pd.DataFrame(data)

        with pd.ExcelWriter(export_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="测试结果详情", index=False)

            summary_data = {
                "测试名称": [test_run.name],
                "测试描述": [test_run.description or ""],
                "总题数": [test_run.total_questions],
                "完成题数": [test_run.completed_questions],
                "平均分": [test_run.average_score or 0],
                "幻觉率": [f"{test_run.hallucination_rate or 0:.2f}%"],
                "状态": [test_run.status],
                "创建时间": [test_run.created_at.isoformat()],
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name="测试概览", index=False)

        return FileResponse(
            path=str(export_path),
            filename=f"测试结果_{test_run.name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.xlsx",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    except Exception as e:
        if export_path.exists():
            try:
                os.remove(export_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/{test_run_id}/export/csv")
def export_test_results_csv(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    test_run = get_test_run(test_run_id, current_user)
    results = get_test_results(test_run_id, current_user=current_user)

    if not results:
        raise HTTPException(status_code=404, detail="No test results found")

    export_path = Path(__file__).parent.parent.parent / f"export_{uuid.uuid4().hex}.csv"

    try:
        data = []
        for r in results:
            data.append(
                {
                    "问题ID": r.question_id,
                    "问题": r.question,
                    "标准答案": r.standard_answer,
                    "AI回答": r.ai_answer or "",
                    "分类": r.category,
                    "准确性": r.accuracy or 0,
                    "完整性": r.completeness or 0,
                    "可操作性": r.actionability or 0,
                    "一致性": r.consistency or 0,
                    "总分": r.total_score or 0,
                    "问题描述": r.issues or "",
                    "错误信息": r.error_message or "",
                    "创建时间": r.created_at.isoformat(),
                }
            )

        df = pd.DataFrame(data)
        df.to_csv(export_path, index=False, encoding="utf-8-sig")

        return FileResponse(
            path=str(export_path),
            filename=f"测试结果_{test_run.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
            media_type="text/csv",
        )

    except Exception as e:
        if export_path.exists():
            try:
                os.remove(export_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/{test_run_id}/logs")
def get_test_logs(
    test_run_id: str,
    question_id: str = None,
    log_type: str = None,
    current_user: SessionData = Depends(get_current_user),
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM test_logs WHERE test_run_id = ? AND organization_id = ?"
        params = [test_run_id, current_user["organization_id"]]

        if question_id:
            query += " AND question_id = ?"
            params.append(question_id)
        if log_type:
            query += " AND log_type = ?"
            params.append(log_type)

        query += " ORDER BY created_at ASC"
        cursor.execute(query, params)
        rows = cursor.fetchall()

        logs = []
        for row in rows:
            data = dict(row)
            details = None
            if data.get("details"):
                try:
                    import json

                    details = json.loads(data["details"])
                except:
                    pass
            logs.append(
                {
                    "id": data["id"],
                    "test_run_id": data["test_run_id"],
                    "question_id": data.get("question_id"),
                    "log_type": data["log_type"],
                    "message": data["message"],
                    "details": details,
                    "created_at": data["created_at"],
                }
            )
        return logs


@router.get("/compare/{base_run_id}/{compare_run_id}", response_model=VersionComparison)
def compare_test_runs(
    base_run_id: str,
    compare_run_id: str,
    current_user: SessionData = Depends(get_current_user),
):
    base_report = get_test_report(base_run_id, current_user)
    compare_report = get_test_report(compare_run_id, current_user)

    score_change = compare_report.overview.average_score - base_report.overview.average_score

    category_changes: Dict[str, float] = {}
    all_categories = set(base_report.overview.category_stats.keys()) | set(
        compare_report.overview.category_stats.keys()
    )
    for cat in all_categories:
        base_avg = base_report.overview.category_stats.get(cat, 0)
        compare_avg = compare_report.overview.category_stats.get(cat, 0)
        category_changes[cat] = compare_avg - base_avg

    base_low_scores = [
        {
            "question_id": r.question_id,
            "question": r.question,
            "score": r.total_score,
        }
        for r in base_report.results
        if (r.total_score or 0) < 60
    ]

    return VersionComparison(
        base_run=base_report.overview.test_run,
        compare_run=compare_report.overview.test_run,
        score_change=score_change,
        category_changes=category_changes,
        low_score_questions=base_low_scores,
    )


@router.get("/{test_run_id}", response_model=TestRun)
def get_test_run(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM test_runs WHERE id = ? AND organization_id = ?",
            (test_run_id, current_user["organization_id"]),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Test run not found")

        data = dict(row)
        return TestRun(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            batch_id=data.get("batch_id"),
            status=data["status"],
            total_questions=data.get("total_questions", 0),
            completed_questions=data.get("completed_questions", 0),
            average_score=data.get("average_score"),
            hallucination_rate=data.get("hallucination_rate"),
            started_at=datetime.fromisoformat(data["started_at"])
            if data.get("started_at")
            else None,
            completed_at=datetime.fromisoformat(data["completed_at"])
            if data.get("completed_at")
            else None,
            created_at=datetime.fromisoformat(data["created_at"]),
        )


@router.delete("/{test_run_id}", response_model=MessageResponse)
def delete_test_run(
    test_run_id: str, current_user: SessionData = Depends(get_current_user)
):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM test_runs WHERE id = ? AND organization_id = ?",
            (test_run_id, current_user["organization_id"]),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Test run not found")

    return MessageResponse(message="Test run deleted successfully")
