"""AI assistant router — POST /ai/query per the brief.

Phase 8: Groq NL parsing (ai_nl) in front of the Phase 6 deterministic
keyword engine, which remains the guaranteed fallback — the endpoint answers
from the live DB with or without a GROQ_API_KEY and never 500s.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import AiQueryRequest, AiQueryResponse
from app.services import ai_nl as ai_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

DbDep = Annotated[Session, Depends(get_db)]


@router.post(
    "/query",
    response_model=AiQueryResponse,
    summary='Ask a natural-language question (e.g. "Where is my seat? My email is amit@ethara.ai")',
)
def query(payload: AiQueryRequest, db: DbDep):
    history = [turn.model_dump() for turn in payload.history]
    return {"answer": ai_service.answer_query(db, payload.query, history)}
