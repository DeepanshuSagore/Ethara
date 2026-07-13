"""AI assistant request/response — POST /ai/query per the brief."""
from pydantic import BaseModel, Field


class AiQueryRequest(BaseModel):
    query: str = Field(min_length=1, examples=["Where is my seat? My email is amit@ethara.ai"])


class AiQueryResponse(BaseModel):
    answer: str
