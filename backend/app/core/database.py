"""SQLAlchemy engine, session factory, and declarative base.

Models are defined in app/models (Phase 4). Use `get_db` as a FastAPI dependency.
"""
from collections.abc import Generator

from sqlalchemy import MetaData, create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# SQLite needs a special connect arg; Postgres does not.
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)

if engine.dialect.name == "sqlite":
    # SQLite ships with foreign-key enforcement OFF per connection; turn it on
    # so local dev matches PostgreSQL's referential integrity.
    @event.listens_for(engine, "connect")
    def _sqlite_fk_pragma(dbapi_connection, _record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Deterministic constraint/index names so Alembic autogenerate is stable across
# databases (SQLite locally, PostgreSQL on Render) and migrations stay diffable.
NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
