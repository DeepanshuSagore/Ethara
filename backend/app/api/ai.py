"""AI assistant router — POST /ai/query per the brief.

Phase 6 ships the deterministic keyword engine (works offline, answers from
the live DB); Phase 8 layers Groq NL parsing on top with this as fallback.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas import AiQueryRequest, AiQueryResponse
from app.services import ai_query as ai_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

DbDep = Annotated[Session, Depends(get_db)]


@router.post(
    "/query",
    response_model=AiQueryResponse,
    summary='Ask a natural-language question (e.g. "Where is my seat? My email is amit@ethara.ai")',
)
def query(payload: AiQueryRequest, db: DbDep):
    return {"answer": ai_service.answer_query(db, payload.query)}
