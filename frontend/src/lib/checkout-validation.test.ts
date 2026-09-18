import { describe, expect, it } from 'vitest';
import { validateCheckoutInput } from './checkout-validation';

describe('validateCheckoutInput', () => {
  it('normalizes valid checkout data and strips unsafe characters', () => {
    const result = validateCheckoutInput({
      first_name: '  <Demo>  ',
      last_name: 'Customer',
      address_1: '550 Central Park West',
      city: 'New York',
      state: 'NY',
      postcode: '10023',
      country: 'us',
      email: 'customer@example.com',
      phone: '+1 555 0100',
      customer_note: 'Line one\nLine <two>',
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.billingAddress.first_name).toBe('Demo');
    expect(result.billingAddress.country).toBe('US');
    expect(result.customerNote).toBe('Line one\nLine two');
  });

  it('rejects missing required fields', () => {
    const result = validateCheckoutInput({
      first_name: 'Demo',
      last_name: 'Customer',
      email: 'customer@example.com',
    });

    expect(result).toEqual({
      ok: false,
      code: 'engineering_demo_invalid_checkout',
      message: 'Checkout field address_1 is required.',
    });
  });

  it('rejects malformed email addresses', () => {
    const result = validateCheckoutInput({
      first_name: 'Demo',
      last_name: 'Customer',
      address_1: '1 Main Street',
      city: 'New York',
      postcode: '10023',
      country: 'US',
      email: 'not-an-email',
    });

    expect(result).toEqual({
      ok: false,
      code: 'engineering_demo_invalid_email',
      message: 'A valid email address is required.',
    });
  });

  it('rejects an invalid country code', () => {
    const result = validateCheckoutInput({
      first_name: 'Demo',
      last_name: 'Customer',
      address_1: '1 Main Street',
      city: 'New York',
      postcode: '10023',
      country: 'U',
      email: 'customer@example.com',
    });

    expect(result).toEqual({
      ok: false,
      code: 'engineering_demo_invalid_country',
      message: 'Country must be a two-letter ISO code.',
    });
  });
});
