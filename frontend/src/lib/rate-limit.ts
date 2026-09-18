type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 2000;

export function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  if (policy.limit < 1 || policy.windowMs < 1) {
    throw new Error('Rate limit policy must use positive values.');
  }

  cleanupExpiredBuckets(now);

  const existing = buckets.get(key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + policy.windowMs }
      : existing;

  bucket.count += 1;
  buckets.set(key, bucket);

  const allowed = bucket.count <= policy.limit;
  const remaining = Math.max(0, policy.limit - bucket.count);

  return {
    allowed,
    limit: policy.limit,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function requestRateLimitKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const address = (forwarded || realIp || 'unknown').slice(0, 128);

  return `${scope}:${address}`;
}

export function rateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('RateLimit-Limit', String(result.limit));
  headers.set('RateLimit-Remaining', String(result.remaining));
  headers.set('RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.allowed) {
    headers.set('Retry-After', String(result.retryAfterSeconds));
  }

  return headers;
}

export function resetRateLimitState(): void {
  buckets.clear();
}

function cleanupExpiredBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  const overflow = buckets.size - MAX_BUCKETS;

  for (const key of buckets.keys()) {
    buckets.delete(key);

    if (buckets.size <= MAX_BUCKETS - Math.min(100, overflow)) {
      break;
    }
  }
}
