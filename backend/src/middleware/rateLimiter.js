const buckets = new Map();

const isTestRuntime = () =>
  process.env.NODE_ENV === "test" ||
  process.env.VITEST === "true" ||
  Boolean(process.env.VITEST_WORKER_ID);

const getClientKey = (req) => {
  const forwardedFor = req?.headers?.["x-forwarded-for"] || req?.headers?.["X-Forwarded-For"];
  const forwardedIp = String(forwardedFor || "").split(",")[0].trim();
  return forwardedIp || req?.ip || req?.socket?.remoteAddress || "unknown";
};

export function createRateLimiter({
  windowMs = 60_000,
  maxRequests = 10,
  keyPrefix = "rate-limit",
} = {}) {
  return function rateLimit(req, res) {
    if (isTestRuntime() && process.env.ENABLE_RATE_LIMIT_TESTS !== "true") {
      return false;
    }

    const now = Date.now();
    const path = req?.originalUrl || req?.path || req?.url || "unknown";
    const key = `${keyPrefix}:${getClientKey(req)}:${path}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return false;
    }

    bucket.count += 1;
    if (bucket.count <= maxRequests) {
      return false;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    if (typeof res.set === "function") {
      res.set("Retry-After", String(retryAfterSeconds));
    }
    res.status(429).json({ error: "Too many requests" });
    return true;
  };
}

export function resetRateLimiters() {
  buckets.clear();
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: "auth",
});
