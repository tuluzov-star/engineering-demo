import type { CheckoutAddress } from './store-api';

const REQUIRED_ADDRESS_FIELDS: Array<keyof CheckoutAddress> = [
  'first_name',
  'last_name',
  'address_1',
  'city',
  'postcode',
  'country',
  'email',
];

export type CheckoutValidationResult =
  | {
      ok: true;
      billingAddress: CheckoutAddress;
      customerNote: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export function validateCheckoutInput(input: Record<string, unknown>): CheckoutValidationResult {
  const billingAddress = normalizeAddress(input);

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!billingAddress[field]) {
      return {
        ok: false,
        code: 'engineering_demo_invalid_checkout',
        message: `Checkout field ${field} is required.`,
      };
    }
  }

  if (!/^\S+@\S+\.\S+$/.test(billingAddress.email)) {
    return {
      ok: false,
      code: 'engineering_demo_invalid_email',
      message: 'A valid email address is required.',
    };
  }

  if (!/^[A-Z]{2}$/.test(billingAddress.country)) {
    return {
      ok: false,
      code: 'engineering_demo_invalid_country',
      message: 'Country must be a two-letter ISO code.',
    };
  }

  return {
    ok: true,
    billingAddress,
    customerNote: cleanMultilineText(input.customer_note, 500),
  };
}

function normalizeAddress(input: Record<string, unknown>): CheckoutAddress {
  return {
    first_name: cleanSingleLineText(input.first_name, 80),
    last_name: cleanSingleLineText(input.last_name, 80),
    company: cleanSingleLineText(input.company, 120),
    address_1: cleanSingleLineText(input.address_1, 160),
    address_2: cleanSingleLineText(input.address_2, 160),
    city: cleanSingleLineText(input.city, 120),
    state: cleanSingleLineText(input.state, 80),
    postcode: cleanSingleLineText(input.postcode, 32),
    country: cleanSingleLineText(input.country, 2).toUpperCase(),
    email: cleanSingleLineText(input.email, 160),
    phone: cleanSingleLineText(input.phone, 40),
  };
}

function cleanSingleLineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function cleanMultilineText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}
