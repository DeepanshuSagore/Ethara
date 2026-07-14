"""AI assistant request/response — POST /ai/query per the brief."""
from typing import Literal

from pydantic import BaseModel, Field


class AiChatTurn(BaseModel):
    """One prior message, so follow-ups ("what about floor 2?") keep context."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AiQueryRequest(BaseModel):
    query: str = Field(min_length=1, examples=["Where is my seat? My email is amit@ethara.ai"])
    # Recent turns only — the service re-caps length and count server-side.
    history: list[AiChatTurn] = Field(default_factory=list, max_length=20)


class AiQueryResponse(BaseModel):
    answer: str
