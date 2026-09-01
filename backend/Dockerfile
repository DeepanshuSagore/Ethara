# syntax=docker/dockerfile:1

# Pinned to the 3.14 series on purpose. requirements.txt pins psycopg[binary]
# because that is where the cp314 wheels are (see DEBUGGING_NOTES.md); a
# floating python:3-slim would eventually land on an interpreter those wheels
# do not cover and fall back to a source build, or simply fail.
ARG PYTHON_VERSION=3.14-slim

# --- builder: resolve dependencies into a self-contained venv ----------------
FROM python:${PYTHON_VERSION} AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copied alone so the dependency layer is cached until the pins actually change.
COPY requirements.txt .
RUN pip install -r requirements.txt

# --- runtime: the venv plus the application, nothing else --------------------
FROM python:${PYTHON_VERSION} AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN useradd --create-home --uid 1000 ethara

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY --chown=ethara:ethara alembic.ini ./
COPY --chown=ethara:ethara alembic ./alembic
COPY --chown=ethara:ethara app ./app
COPY --chown=ethara:ethara docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER ethara
EXPOSE 8000

CMD ["./docker-entrypoint.sh"]
