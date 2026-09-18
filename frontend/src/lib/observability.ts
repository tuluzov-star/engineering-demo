import 'server-only';

import { NextResponse } from 'next/server';

export type RequestContext = {
  requestId: string;
  method: string;
  route: string;
  startedAt: number;
};

export type RequestOutcome =
  | 'success'
  | 'client_error'
  | 'rate_limited'
  | 'upstream_error'
  | 'unavailable';

type ObservedResponseOptions = {
  status?: number;
  headers?: HeadersInit;
  outcome: RequestOutcome;
  errorCode?: string;
  upstreamStatus?: number;
};

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

export function createRequestContext(request: Request, route: string): RequestContext {
  const suppliedRequestId = request.headers.get('x-request-id')?.trim() ?? '';
  const requestId = REQUEST_ID_PATTERN.test(suppliedRequestId)
    ? suppliedRequestId
    : crypto.randomUUID();

  return {
    requestId,
    method: request.method,
    route,
    startedAt: Date.now(),
  };
}

export function observedJson<T>(
  context: RequestContext,
  body: T,
  options: ObservedResponseOptions,
): NextResponse<T> {
  const status = options.status ?? 200;
  const headers = new Headers(options.headers);
  headers.set('X-Request-ID', context.requestId);

  logRequest(context, {
    status,
    outcome: options.outcome,
    errorCode: options.errorCode,
    upstreamStatus: options.upstreamStatus,
  });

  return NextResponse.json(body, { status, headers });
}

export function logEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: {
    requestId?: string;
    route?: string;
    status?: number;
    outcome?: string;
    errorCode?: string;
    upstreamStatus?: number;
    durationMs?: number;
  } = {},
): void {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: 'engineering-demo-frontend',
    event,
    ...(fields.requestId ? { request_id: fields.requestId } : {}),
    ...(fields.route ? { route: fields.route } : {}),
    ...(typeof fields.status === 'number' ? { status: fields.status } : {}),
    ...(fields.outcome ? { outcome: fields.outcome } : {}),
    ...(fields.errorCode ? { error_code: fields.errorCode } : {}),
    ...(typeof fields.upstreamStatus === 'number'
      ? { upstream_status: fields.upstreamStatus }
      : {}),
    ...(typeof fields.durationMs === 'number'
      ? { duration_ms: fields.durationMs }
      : {}),
  };

  const line = JSON.stringify(record);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function logRequest(
  context: RequestContext,
  fields: {
    status: number;
    outcome: RequestOutcome;
    errorCode?: string;
    upstreamStatus?: number;
  },
): void {
  const level = fields.status >= 500 ? 'error' : fields.status >= 400 ? 'warn' : 'info';

  logEvent(level, 'http_request', {
    requestId: context.requestId,
    route: context.route,
    status: fields.status,
    outcome: fields.outcome,
    errorCode: fields.errorCode,
    upstreamStatus: fields.upstreamStatus,
    durationMs: Math.max(0, Date.now() - context.startedAt),
  });
}
