import { NextResponse } from 'next/server';
import { getApplicationReadiness } from '@/lib/readiness';
import { logEvent } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = await getApplicationReadiness();
  const status = readiness.ready ? 200 : 503;

  if (!readiness.ready) {
    logEvent('warn', 'health_degraded', {
      route: '/api/health',
      status,
      outcome: 'unavailable',
    });
  }

  return NextResponse.json(
    {
      status: readiness.ready ? 'ok' : 'degraded',
      frontend: 'nextjs',
      checks: readiness.checks,
      backend: readiness.backend,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
