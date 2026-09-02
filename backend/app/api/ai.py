"""AI assistant router — POST /ai/query per the brief.

Phase 8: Groq NL parsing (ai_nl) in front of the Phase 6 deterministic
keyword engine, which remains the guaranteed fallback — the endpoint answers
from the live DB with or without a GROQ_API_KEY and never 500s.

This is the only route that spends money, and the demo is public with a real
key on it, so it is also the only route that is rate limited.
"""
import logging
import math
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import RateLimiter
from app.schemas import AiQueryRequest, AiQueryResponse
from app.services import ai_nl as ai_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

logger = logging.getLogger(__name__)

DbDep = Annotated[Session, Depends(get_db)]

limiter = RateLimiter(
    capacity=settings.ai_rate_limit_requests,
    per_seconds=settings.ai_rate_limit_window_seconds,
)


def _client_key(request: Request) -> str:
    """The caller's IP, trusting one proxy hop.

    Render and Vercel both front the app, so request.client is the proxy and
    the real caller is the first entry in X-Forwarded-For. That header is
    spoofable by anyone talking to the API directly, which is the accepted
    limit here: this protects a demo budget, not an auth boundary.
    """
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else "unknown"


@router.post(
    "/query",
    response_model=AiQueryResponse,
    summary='Ask a natural-language question (e.g. "Where is my seat? My email is amit@ethara.ai")',
    responses={429: {"description": "Too many requests from this client."}},
)
def query(payload: AiQueryRequest, db: DbDep, request: Request):
    retry_after = limiter.check(_client_key(request))
    if retry_after is not None:
        # Ceil, never zero: a Retry-After of 0 invites an immediate retry that
        # is guaranteed to be refused again.
        seconds = max(1, math.ceil(retry_after))
        logger.warning(
            "rate limit exceeded",
            extra={"event": "rate_limited", "retry_after": seconds},
        )
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many questions in a short window. Try again shortly.",
            headers={"Retry-After": str(seconds)},
        )
    history = [turn.model_dump() for turn in payload.history]
    return {"answer": ai_service.answer_query(db, payload.query, history)}
