"""Per-client token bucket for the assistant endpoint.

In-process and in-memory on purpose. The demo runs as a single container, and
a Redis dependency to protect one endpoint would cost more to operate than the
Groq spend it saves. The trade-off is explicit: with more than one replica each
holds its own buckets, so the effective limit is per replica, not global.

A bucket refills continuously rather than resetting on a fixed window, so a
caller who waits gets served immediately instead of queueing for a boundary.
"""
import threading
import time
from dataclasses import dataclass, field

# Buckets are evicted once full, so this only bounds how many distinct callers
# can be mid-limit at once. Well above any plausible demo load, and small
# enough that a spoofed-IP flood cannot grow the dict without limit.
MAX_TRACKED_CLIENTS = 10_000


@dataclass
class _Bucket:
    tokens: float
    updated_at: float


@dataclass
class RateLimiter:
    """`capacity` requests immediately, then `capacity / per_seconds` sustained."""

    capacity: int
    per_seconds: float
    _buckets: dict[str, _Bucket] = field(default_factory=dict)
    _lock: threading.Lock = field(default_factory=threading.Lock)

    @property
    def _refill_per_second(self) -> float:
        return self.capacity / self.per_seconds

    def check(self, key: str) -> float | None:
        """None when allowed; otherwise the seconds to wait before retrying."""
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                self._evict_full(now)
                bucket = _Bucket(tokens=float(self.capacity), updated_at=now)
                self._buckets[key] = bucket

            elapsed = now - bucket.updated_at
            bucket.tokens = min(
                float(self.capacity), bucket.tokens + elapsed * self._refill_per_second
            )
            bucket.updated_at = now

            if bucket.tokens >= 1:
                bucket.tokens -= 1
                return None
            return (1 - bucket.tokens) / self._refill_per_second

    def _evict_full(self, now: float) -> None:
        """Drop callers who have refilled to capacity — they are indistinguishable
        from callers who were never seen, so keeping them only costs memory."""
        if len(self._buckets) < MAX_TRACKED_CLIENTS:
            return
        for key, bucket in list(self._buckets.items()):
            refilled = bucket.tokens + (now - bucket.updated_at) * self._refill_per_second
            if refilled >= self.capacity:
                del self._buckets[key]

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()
