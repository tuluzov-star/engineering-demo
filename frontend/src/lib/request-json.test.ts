import { describe, expect, it } from 'vitest';
import { readJsonObject } from './request-json';

describe('readJsonObject', () => {
  it('returns a JSON object', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ id: 42 }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonObject(request)).resolves.toEqual({ id: 42 });
  });

  it('rejects malformed JSON', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: '{broken',
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      status: 400,
      code: 'engineering_demo_invalid_json',
    });
  });

  it('rejects arrays and scalar payloads', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify(['not', 'an', 'object']),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonObject(request)).rejects.toMatchObject({
      status: 400,
      code: 'engineering_demo_invalid_json_object',
    });
  });

  it('rejects bodies larger than the configured limit', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ value: 'x'.repeat(200) }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(readJsonObject(request, 32)).rejects.toMatchObject({
      status: 413,
      code: 'engineering_demo_request_too_large',
    });
  });
});
