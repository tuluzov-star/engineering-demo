import { NextResponse } from 'next/server';
import { getApplicationReadiness } from '@/lib/readiness';
import { logEvent } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET() {
  const readiness = await getApplicationReadiness();
  const status = readiness.ready ? 200 : 503;

  if (!readiness.ready) {
    logEvent('warn', 'readiness_failed', {
      route: '/api/ready',
      status,
      outcome: 'unavailable',
    });
  }

  return NextResponse.json(
    {
      status: readiness.ready ? 'ready' : 'not_ready',
      service: 'engineering-demo-frontend',
      checks: readiness.checks,
      backend: readiness.backend,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}
