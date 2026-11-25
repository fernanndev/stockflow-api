import time
from collections import defaultdict, deque


class FailedAttemptsLimiter:
    """Blocks a key after too many failed attempts inside a time window.

    It lives in memory: enough for one server process, and it starts clean when the
    server restarts. The key of a login is the client address plus the e-mail typed, so
    one person guessing passwords is stopped without locking the other users out.
    """

    def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = defaultdict(deque)

    def _recent(self, key: str) -> deque[float]:
        failures = self._failures[key]
        limit = time.monotonic() - self.window_seconds

        while failures and failures[0] < limit:
            failures.popleft()

        return failures

    def is_blocked(self, key: str) -> bool:
        return len(self._recent(key)) >= self.max_attempts

    def retry_after(self, key: str) -> int:
        failures = self._recent(key)

        if not failures:
            return 0

        return max(1, int(failures[0] + self.window_seconds - time.monotonic()) + 1)

    def register_failure(self, key: str) -> None:
        self._recent(key).append(time.monotonic())

    def reset(self, key: str) -> None:
        self._failures.pop(key, None)

    def clear(self) -> None:
        self._failures.clear()


login_limiter = FailedAttemptsLimiter()
