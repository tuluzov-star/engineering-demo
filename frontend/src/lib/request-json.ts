export class RequestBodyError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'RequestBodyError';
  }
}

export async function readJsonObject(
  request: Request,
  maxBytes = 8 * 1024,
): Promise<Record<string, unknown>> {
  const contentLength = Number(request.headers.get('content-length') ?? 0);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestBodyError(
      413,
      'engineering_demo_request_too_large',
      'Request body is too large.',
    );
  }

  const raw = await request.text();
  const byteLength = new TextEncoder().encode(raw).byteLength;

  if (byteLength > maxBytes) {
    throw new RequestBodyError(
      413,
      'engineering_demo_request_too_large',
      'Request body is too large.',
    );
  }

  let value: unknown;

  try {
    value = raw ? JSON.parse(raw) : null;
  } catch {
    throw new RequestBodyError(
      400,
      'engineering_demo_invalid_json',
      'Request body must contain valid JSON.',
    );
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestBodyError(
      400,
      'engineering_demo_invalid_json_object',
      'Request body must be a JSON object.',
    );
  }

  return value as Record<string, unknown>;
}
