"""Structured JSON logging — one line per request, correlated by request id.

Every log record is emitted as a single JSON object so a production incident is
a log query rather than an investigation. The request id is held in a
ContextVar, so anything logged while handling a request carries it without
having to thread the id through every call signature.

Deliberately NOT logged anywhere: the Groq API key, employee emails or names,
and request or response bodies. Paths are logged, query strings are not — the
employee search puts free text (and, in the AI assistant's case, whatever the
user typed) into the query string.
"""
import json
import logging
import sys
from contextvars import ContextVar
from typing import Any

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

# Anything the LogRecord carries as standard. Whatever is left on a record was
# put there by `extra=` at the call site, so it belongs in the JSON payload.
_STANDARD_ATTRS = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__
) | {"asctime", "message", "taskName"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        request_id = request_id_var.get()
        if request_id:
            payload["request_id"] = request_id
        for key, value in record.__dict__.items():
            if key not in _STANDARD_ATTRS:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: str = "INFO") -> None:
    """Point the root logger at one JSON handler on stdout.

    Called once at import time in app.main. Uvicorn installs its own handlers
    on its own loggers, so those are cleared and left to propagate up to this
    one; otherwise every access line is emitted twice, once plain and once
    structured.
    """
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = []
        uvicorn_logger.propagate = True
