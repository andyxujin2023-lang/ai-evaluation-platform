import httpx
from typing import Optional
from ..core.config import get_config_with_db


class DifyService:
    def __init__(self, api_url: Optional[str] = None, api_key: Optional[str] = None):
        self.api_url = api_url or get_config_with_db("DIFY_API_URL", "https://api.dify.ai/v1")
        self.api_key = api_key or get_config_with_db("DIFY_API_KEY", "")

    async def chat(self, query: str, user: str = "evaluation-user") -> Optional[str]:
        url = f"{self.api_url}/chat-messages"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "conversation_id": "",
            "user": user
        }

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data.get("answer", "")
        except Exception as e:
            raise Exception(f"Dify API call failed: {str(e)}")
