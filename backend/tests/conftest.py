"""Shared fixtures — a fresh schema per test, on either engine.

The suite runs against in-memory SQLite by default because it is fast enough
to run on every save. Set TEST_DATABASE_URL to a PostgreSQL URL and every test
runs a second time against Postgres as well:

    TEST_DATABASE_URL=postgresql+psycopg://ethara:ethara@localhost:5433/ethara_test pytest

That second pass is the point. Production runs Postgres; SQLite disagrees with
it about type affinity, VARCHAR length enforcement, LIKE case sensitivity and
the order rows come back in without an ORDER BY. A green SQLite-only suite
proves the SQLite schema is correct and says nothing about the deployed one.
"""
import json
import logging
import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool, StaticPool

import app.models  # noqa: F401 — register all tables on Base
from app.api import ai as ai_router
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.logging import JsonFormatter
from app.main import app as fastapi_app
from app.services import ai_nl

POSTGRES_TEST_URL = os.getenv("TEST_DATABASE_URL", "")


@pytest.fixture(autouse=True)
def offline_groq(monkeypatch):
    """Tests never reach Groq: a blank key short-circuits the Phase 8 NL layer
    to the deterministic engine, even when backend/.env holds a real key.
    Groq-layer tests opt back in with a fake key and a mocked HTTP transport."""
    monkeypatch.setattr(settings, "groq_api_key", "")


@pytest.fixture(autouse=True)
def fresh_rate_limit():
    """The limiter is a module-level singleton holding one bucket per client.

    Without this, every /ai/query test spends from the same bucket and whichever
    ones happen to run last get a 429 — an ordering-dependent suite. Tests that
    exercise the limit deliberately do so from a clean bucket.
    """
    ai_router.limiter.reset()


@pytest.fixture(autouse=True)
def fresh_parse_cache():
    """Likewise for the parse cache: a parse cached by an earlier test would
    silently skip the mocked Groq call a later one is asserting on."""
    ai_nl.reset_parse_cache()


def _sqlite_engine() -> Engine:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def _postgres_engine() -> Engine:
    # NullPool: each test drops and recreates the schema, and a pooled
    # connection holding an old view of it deadlocks the DROP.
    return create_engine(POSTGRES_TEST_URL, poolclass=NullPool)


@pytest.fixture(
    params=[
        pytest.param("sqlite", id="sqlite"),
        pytest.param(
            "postgres",
            id="postgres",
            marks=pytest.mark.skipif(
                not POSTGRES_TEST_URL,
                reason="set TEST_DATABASE_URL to run this tier (see the module docstring)",
            ),
        ),
    ]
)
def engine(request) -> Generator[Engine]:
    engine = _sqlite_engine() if request.param == "sqlite" else _postgres_engine()
    # In-memory SQLite starts empty every time; a real Postgres database does
    # not, so drop first rather than assume a clean slate.
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def db(engine) -> Generator[Session]:
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db) -> Generator[TestClient]:
    """API test client whose requests share the test's session."""

    def override_get_db():
        yield db

    fastapi_app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client
    finally:
        fastapi_app.dependency_overrides.clear()


class _CapturingHandler(logging.Handler):
    def __init__(self) -> None:
        super().__init__()
        self.setFormatter(JsonFormatter())
        self.records: list[dict] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(json.loads(self.format(record)))


@pytest.fixture()
def log_lines() -> Generator[list[dict]]:
    """The parsed JSON a production log would actually contain.

    Formats through JsonFormatter rather than reading record attributes, so a
    field that fails to serialise fails the test instead of passing silently.
    """
    handler = _CapturingHandler()
    root = logging.getLogger()
    root.addHandler(handler)
    try:
        yield handler.records
    finally:
        root.removeHandler(handler)
