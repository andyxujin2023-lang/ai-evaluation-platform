import httpx
import json
from typing import Optional
from ..core.config import get_config_with_db
from ..models.schemas import ScoringResult


class ScoringService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or get_config_with_db("TONGYI_API_KEY", "")
        self.model = model or get_config_with_db("TONGYI_MODEL", "qwen-max")

    async def score_answer(
        self,
        question: str,
        standard_answer: str,
        ai_answer: str
    ) -> ScoringResult:
        prompt = f"""你是一个专业的AI回答评分专家。请根据以下标准对AI回答进行评分。

评分标准（总分100分）：
1. 准确性 (accuracy, 40分)：回答是否符合事实，与标准答案是否一致
2. 完整性 (completeness, 30分)：回答是否涵盖了问题的所有方面
3. 可操作性 (actionability, 20分)：回答是否具体可行，有明确的操作指导
4. 一致性 (consistency, 10分)：回答是否逻辑自洽，没有自相矛盾

问题：{question}

标准答案：{standard_answer}

AI回答：{ai_answer}

请以JSON格式输出评分结果，格式如下：
{{
    "accuracy": 数字,
    "completeness": 数字,
    "actionability": 数字,
    "consistency": 数字,
    "issues": "简要说明存在的问题",
    "total_score": 总分
}}

只输出JSON，不要其他文字。"""

        try:
            result = await self._call_tongyi_api(prompt)
            return result
        except Exception as e:
            return ScoringResult(
                accuracy=0,
                completeness=0,
                actionability=0,
                consistency=0,
                issues=f"评分失败: {str(e)}",
                total_score=0
            )

    async def _call_tongyi_api(self, prompt: str) -> ScoringResult:
        url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "input": {
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            },
            "parameters": {
                "temperature": 0,
                "max_tokens": 1000
            }
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            content = data["output"]["text"]
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

            result = json.loads(content)

            return ScoringResult(
                accuracy=float(result.get("accuracy", 0)),
                completeness=float(result.get("completeness", 0)),
                actionability=float(result.get("actionability", 0)),
                consistency=float(result.get("consistency", 0)),
                issues=result.get("issues", ""),
                total_score=float(result.get("total_score", 0))
            )
