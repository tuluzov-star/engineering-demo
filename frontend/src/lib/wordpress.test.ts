import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CATALOG_CACHE_TAG,
  CATALOG_REVALIDATE_SECONDS,
  getProducts,
  getStoreApiReadiness,
} from './wordpress';

describe('WordPress data fetching', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses bounded revalidation for the public product catalogue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getProducts()).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      next: {
        revalidate: CATALOG_REVALIDATE_SECONDS,
        tags: [CATALOG_CACHE_TAG],
      },
    });
    expect(CATALOG_REVALIDATE_SECONDS).toBe(60);
  });

  it('keeps readiness probes uncached', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(getStoreApiReadiness()).resolves.toBe(true);

    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: 'no-store' });
  });
});
