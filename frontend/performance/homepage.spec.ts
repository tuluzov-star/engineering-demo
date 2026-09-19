import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import budget from '../performance-budget.json';

type PerformanceMetrics = {
  ttfbMs: number;
  lcpMs: number;
  cls: number;
  loadMs: number;
  totalEncodedBytes: number;
  scriptEncodedBytes: number;
  domNodes: number;
};

test('production homepage stays within the performance budget', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const target = window as typeof window & {
      __engineeringDemoPerformance?: {
        lcpMs: number;
        cls: number;
      };
    };

    target.__engineeringDemoPerformance = {
      lcpMs: 0,
      cls: 0,
    };

    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries.at(-1);

        if (latest && target.__engineeringDemoPerformance) {
          target.__engineeringDemoPerformance.lcpMs = latest.startTime;
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    }

    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };

          if (!shift.hadRecentInput && target.__engineeringDemoPerformance) {
            target.__engineeringDemoPerformance.cls += shift.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    }
  });

  const response = await page.goto('/', { waitUntil: 'networkidle' });

  expect(response?.ok()).toBe(true);
  await expect(page.getByText('Backend connected')).toBeVisible();
  await page.waitForTimeout(500);

  const metrics = await page.evaluate<PerformanceMetrics>(() => {
    const navigation = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType(
      'resource',
    ) as PerformanceResourceTiming[];
    const observed = (
      window as typeof window & {
        __engineeringDemoPerformance?: {
          lcpMs: number;
          cls: number;
        };
      }
    ).__engineeringDemoPerformance ?? { lcpMs: 0, cls: 0 };

    const totalEncodedBytes =
      navigation.encodedBodySize +
      resources.reduce((sum, resource) => sum + resource.encodedBodySize, 0);
    const scriptEncodedBytes = resources
      .filter((resource) => resource.initiatorType === 'script')
      .reduce((sum, resource) => sum + resource.encodedBodySize, 0);

    return {
      ttfbMs: navigation.responseStart - navigation.requestStart,
      lcpMs: observed.lcpMs,
      cls: observed.cls,
      loadMs: navigation.loadEventEnd - navigation.startTime,
      totalEncodedBytes,
      scriptEncodedBytes,
      domNodes: document.getElementsByTagName('*').length,
    };
  });

  const result = {
    measuredAt: new Date().toISOString(),
    baseUrl: process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3001',
    metrics,
    budget,
  };

  const resultPath = path.resolve(process.cwd(), 'performance-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');

  await testInfo.attach('performance-results', {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: 'application/json',
  });

  expect(metrics.ttfbMs, 'TTFB budget').toBeLessThanOrEqual(budget.ttfbMs);
  expect(metrics.lcpMs, 'LCP budget').toBeGreaterThan(0);
  expect(metrics.lcpMs, 'LCP budget').toBeLessThanOrEqual(budget.lcpMs);
  expect(metrics.cls, 'CLS budget').toBeLessThanOrEqual(budget.cls);
  expect(metrics.loadMs, 'load-event budget').toBeLessThanOrEqual(budget.loadMs);
  expect(metrics.totalEncodedBytes, 'total encoded bytes budget').toBeLessThanOrEqual(
    budget.totalEncodedBytes,
  );
  expect(metrics.scriptEncodedBytes, 'script bytes budget').toBeLessThanOrEqual(
    budget.scriptEncodedBytes,
  );
  expect(metrics.domNodes, 'DOM node budget').toBeLessThanOrEqual(budget.domNodes);
});
