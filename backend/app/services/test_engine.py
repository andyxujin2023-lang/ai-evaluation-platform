import asyncio
import uuid
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..core.database import get_db_connection
from ..models.schemas import TestQuestion, TestResult, TestRun
from .dify_service import DifyService
from .scoring_service import ScoringService


def add_test_log(
    test_run_id: str,
    log_type: str,
    message: str,
    question_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    log_id = str(uuid.uuid4())
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO test_logs (id, test_run_id, question_id, log_type, message, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            log_id,
            test_run_id,
            question_id,
            log_type,
            message,
            json.dumps(details, ensure_ascii=False) if details else None,
            datetime.now().isoformat()
        ))


class TestEngine:
    def __init__(self):
        self.dify_service = DifyService()
        self.scoring_service = ScoringService()
        self._running_tests: Dict[str, Dict[str, Any]] = {}

    async def start_test_run(self, name: str, description: Optional[str] = None, batch_id: Optional[str] = None) -> str:
        test_run_id = str(uuid.uuid4())

        with get_db_connection() as conn:
            cursor = conn.cursor()
            if batch_id:
                cursor.execute("SELECT COUNT(*) as count FROM datasets WHERE batch_id = ?", (batch_id,))
            else:
                cursor.execute("SELECT COUNT(*) as count FROM datasets")
            total = cursor.fetchone()["count"]

            cursor.execute("""
                INSERT INTO test_runs (id, name, description, batch_id, status, total_questions, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (test_run_id, name, description, batch_id, "pending", total, datetime.now().isoformat()))

        add_test_log(
            test_run_id,
            "info",
            f"测试任务已创建: {name}",
            details={"description": description, "batch_id": batch_id, "total_questions": total}
        )

        self._running_tests[test_run_id] = {
            "status": "pending",
            "completed": 0,
            "total": total
        }

        asyncio.create_task(self._execute_test_run(test_run_id, batch_id))

        return test_run_id

    def get_test_progress(self, test_run_id: str) -> Optional[Dict[str, Any]]:
        return self._running_tests.get(test_run_id)

    async def _execute_test_run(self, test_run_id: str, batch_id: Optional[str] = None):
        self._running_tests[test_run_id] = {
            "status": "running",
            "completed": 0,
            "total": 0
        }

        add_test_log(test_run_id, "info", "开始执行测试任务", details={"batch_id": batch_id})

        try:
            questions = self._get_all_questions(batch_id)
            total = len(questions)
            self._running_tests[test_run_id]["total"] = total

            add_test_log(
                test_run_id,
                "info",
                f"获取到 {total} 个测试问题",
                details={"question_count": total, "batch_id": batch_id}
            )

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE test_runs
                    SET status = ?, started_at = ?, total_questions = ?
                    WHERE id = ?
                """, ("running", datetime.now().isoformat(), total, test_run_id))

            for idx, question in enumerate(questions):
                add_test_log(
                    test_run_id,
                    "info",
                    f"开始处理第 {idx + 1}/{total} 个问题",
                    question_id=question.id,
                    details={"question": question.question[:100] + "..." if len(question.question) > 100 else question.question}
                )

                await self._test_single_question(test_run_id, question)
                self._running_tests[test_run_id]["completed"] = idx + 1
                await asyncio.sleep(0.1)

            add_test_log(test_run_id, "info", "所有问题处理完成")

            self._update_test_run_completed(test_run_id)
            self._running_tests[test_run_id]["status"] = "completed"

            add_test_log(test_run_id, "info", "测试任务执行完成")

        except Exception as e:
            add_test_log(
                test_run_id,
                "error",
                f"测试任务执行失败: {str(e)}",
                details={"error": str(e)}
            )

            with get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE test_runs
                    SET status = ?, completed_at = ?
                    WHERE id = ?
                """, ("failed", datetime.now().isoformat(), test_run_id))
            self._running_tests[test_run_id]["status"] = "failed"

    def _get_all_questions(self, batch_id: Optional[str] = None) -> List[TestQuestion]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if batch_id:
                cursor.execute("SELECT * FROM datasets WHERE batch_id = ?", (batch_id,))
            else:
                cursor.execute("SELECT * FROM datasets")
            rows = cursor.fetchall()

            questions = []
            for row in rows:
                data = dict(row)
                try:
                    keywords = json.loads(data["keywords"])
                except (json.JSONDecodeError, TypeError):
                    keywords = []
                questions.append(TestQuestion(
                    id=data["id"],
                    batch_id=data.get("batch_id"),
                    question=data["question"],
                    standard_answer=data["standard_answer"],
                    keywords=keywords,
                    category=data["category"]
                ))
            return questions

    async def _test_single_question(self, test_run_id: str, question: TestQuestion):
        result_id = str(uuid.uuid4())
        ai_answer = None
        error_msg = None
        scoring_result = None

        try:
            add_test_log(
                test_run_id,
                "dify_request",
                "调用 Dify API",
                question_id=question.id,
                details={
                    "question": question.question,
                    "api_url": self.dify_service.api_url
                }
            )

            ai_answer = await self.dify_service.chat(question.question)

            add_test_log(
                test_run_id,
                "dify_response",
                "Dify API 调用成功",
                question_id=question.id,
                details={"ai_answer": ai_answer}
            )

            add_test_log(
                test_run_id,
                "scoring_request",
                "调用评分模型",
                question_id=question.id,
                details={
                    "question": question.question,
                    "standard_answer": question.standard_answer,
                    "ai_answer": ai_answer
                }
            )

            scoring_result = await self.scoring_service.score_answer(
                question.question,
                question.standard_answer,
                ai_answer
            )

            add_test_log(
                test_run_id,
                "scoring_response",
                "评分完成",
                question_id=question.id,
                details={
                    "accuracy": scoring_result.accuracy,
                    "completeness": scoring_result.completeness,
                    "actionability": scoring_result.actionability,
                    "consistency": scoring_result.consistency,
                    "total_score": scoring_result.total_score,
                    "issues": scoring_result.issues
                }
            )

        except Exception as e:
            error_msg = str(e)
            add_test_log(
                test_run_id,
                "error",
                f"处理问题时出错: {str(e)}",
                question_id=question.id,
                details={"error": str(e)}
            )

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO test_results
                (id, test_run_id, question_id, question, standard_answer, ai_answer,
                 accuracy, completeness, actionability, consistency, total_score,
                 issues, category, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result_id,
                test_run_id,
                question.id,
                question.question,
                question.standard_answer,
                ai_answer,
                scoring_result.accuracy if scoring_result else None,
                scoring_result.completeness if scoring_result else None,
                scoring_result.actionability if scoring_result else None,
                scoring_result.consistency if scoring_result else None,
                scoring_result.total_score if scoring_result else None,
                scoring_result.issues if scoring_result else None,
                question.category,
                error_msg,
                datetime.now().isoformat()
            ))

    def _update_test_run_completed(self, test_run_id: str):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT AVG(total_score) as avg_score,
                       COUNT(CASE WHEN total_score < 60 THEN 1 END) as low_score_count,
                       COUNT(*) as total_count
                FROM test_results
                WHERE test_run_id = ?
            """, (test_run_id,))
            stats = cursor.fetchone()

            avg_score = stats["avg_score"] or 0
            low_score_count = stats["low_score_count"] or 0
            total_count = stats["total_count"] or 1
            hallucination_rate = (low_score_count / total_count) * 100

            add_test_log(
                test_run_id,
                "info",
                "更新测试运行统计",
                details={
                    "average_score": avg_score,
                    "hallucination_rate": hallucination_rate,
                    "total_count": total_count
                }
            )

            cursor.execute("""
                UPDATE test_runs
                SET status = ?, completed_at = ?, average_score = ?, hallucination_rate = ?, completed_questions = ?
                WHERE id = ?
            """, ("completed", datetime.now().isoformat(), avg_score, hallucination_rate, total_count, test_run_id))


test_engine = TestEngine()
