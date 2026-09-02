"""AI assistant request/response — POST /ai/query per the brief."""
from typing import Literal

from pydantic import BaseModel, Field


class AiChatTurn(BaseModel):
    """One prior message, so follow-ups ("what about floor 2?") keep context."""

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AiQueryRequest(BaseModel):
    # A body cap, not a UX limit: with history bounded too, a payload cannot
    # exceed ~42 KB. Deliberately above ai_nl's 500-char Groq threshold —
    # longer questions are still answered, just never sent upstream.
    query: str = Field(
        min_length=1, max_length=2000,
        examples=["Where is my seat? My email is amit@ethara.ai"],
    )
    # Recent turns only — the service re-caps length and count server-side.
    history: list[AiChatTurn] = Field(default_factory=list, max_length=20)


class AiQueryResponse(BaseModel):
    answer: str
