import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  rateLimitHeaders,
  requestRateLimitKey,
  resetRateLimitState,
} from './rate-limit';

describe('rate limiting', () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it('allows requests within the limit and rejects the next request', () => {
    const policy = { limit: 2, windowMs: 60_000 };

    const first = checkRateLimit('cart:127.0.0.1', policy, 1_000);
    const second = checkRateLimit('cart:127.0.0.1', policy, 1_001);
    const third = checkRateLimit('cart:127.0.0.1', policy, 1_002);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(third).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
  });

  it('starts a fresh window after reset time', () => {
    const policy = { limit: 1, windowMs: 1_000 };

    expect(checkRateLimit('checkout:client', policy, 10_000).allowed).toBe(true);
    expect(checkRateLimit('checkout:client', policy, 10_500).allowed).toBe(false);
    expect(checkRateLimit('checkout:client', policy, 11_000).allowed).toBe(true);
  });

  it('derives a scoped key from proxy headers', () => {
    const request = new Request('http://localhost/test', {
      headers: {
        'x-forwarded-for': '203.0.113.10, 10.0.0.4',
      },
    });

    expect(requestRateLimitKey(request, 'checkout')).toBe('checkout:203.0.113.10');
  });

  it('emits standard rate-limit response headers', () => {
    const result = checkRateLimit('checkout:client', { limit: 1, windowMs: 5_000 }, 10_000);
    const headers = rateLimitHeaders(result);

    expect(headers.get('RateLimit-Limit')).toBe('1');
    expect(headers.get('RateLimit-Remaining')).toBe('0');
    expect(headers.get('RateLimit-Reset')).toBe('15');
    expect(headers.get('Retry-After')).toBeNull();
  });
});
