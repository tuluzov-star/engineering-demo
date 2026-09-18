import { NextResponse } from 'next/server';
import { getBackendHealth } from '@/lib/wordpress';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backend = await getBackendHealth();

    return NextResponse.json({ status: 'ok', frontend: 'nextjs', backend });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        frontend: 'nextjs',
        backend: null,
        message: error instanceof Error ? error.message : 'Unknown backend error.',
      },
      { status: 503 },
    );
  }
}
