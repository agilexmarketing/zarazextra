import type { MCEvent } from '@managed-components/types';
import { normalizeCountry, normalizeEmail, normalizeName, normalizePhone, normalizeZip } from './normalizers';
import { str } from './utils';

const IDENTITY_KEYS = [
  'em', 'email', 'ph', 'phone', 'phone_number', 'fn', 'first_name', 'ln', 'last_name',
  'ct', 'city', 'st', 'state', 'zp', 'zip', 'postal_code', 'country', 'external_id',
  'subscription_id', 'fb_login_id', 'lead_id', 'db', 'ge'
];

function fromPayload(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return undefined;
}

export function getIdentity(event: MCEvent, phonePrefix = '40'): Record<string, string> {
  const payload = getRootPayload(event);
  const client = event.client;
  const identity: Record<string, string> = {};

  const em = normalizeEmail(fromPayload(payload, ['em', 'email']) || client?.get?.('em') || client?.get?.('email'));
  if (em) {
    identity.em = em;
    identity.email = em;
  }

  const ph = normalizePhone(fromPayload(payload, ['ph', 'phone', 'phone_number']) || client?.get?.('ph') || client?.get?.('phone') || client?.get?.('phone_number'), phonePrefix);
  if (ph) {
    identity.ph = ph;
    identity.phone_number = ph;
  }

  const fn = normalizeName(fromPayload(payload, ['fn', 'first_name']) || client?.get?.('fn') || client?.get?.('first_name'));
  if (fn) {
    identity.fn = fn;
    identity.first_name = fn;
  }

  const ln = normalizeName(fromPayload(payload, ['ln', 'last_name']) || client?.get?.('ln') || client?.get?.('last_name'));
  if (ln) {
    identity.ln = ln;
    identity.last_name = ln;
  }

  const ct = normalizeName(fromPayload(payload, ['ct', 'city']) || client?.get?.('ct') || client?.get?.('city'));
  if (ct) {
    identity.ct = ct;
    identity.city = ct;
  }

  const st = normalizeName(fromPayload(payload, ['st', 'state']) || client?.get?.('st') || client?.get?.('state'));
  if (st) {
    identity.st = st;
    identity.state = st;
  }

  const zp = normalizeZip(fromPayload(payload, ['zp', 'zip', 'postal_code']) || client?.get?.('zp') || client?.get?.('zip') || client?.get?.('postal_code'));
  if (zp) {
    identity.zp = zp;
    identity.zip = zp;
  }

  const country = normalizeCountry(fromPayload(payload, ['country']) || client?.get?.('country'));
  if (country) identity.country = country;

  for (const key of ['external_id', 'subscription_id', 'fb_login_id', 'lead_id', 'db', 'ge']) {
    const value = str(payload[key] || client?.get?.(key), 128);
    if (value) identity[key] = value;
  }

  return identity;
}

export function removeIdentityKeys(payload: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...payload };
  for (const key of IDENTITY_KEYS) delete copy[key];
  return copy;
}

export function getRootPayload(event: MCEvent): Record<string, unknown> {
  const p = (event.payload || {}) as Record<string, unknown>;
  if (p.ecommerce && typeof p.ecommerce === 'object') {
    return { ...p, ...(p.ecommerce as Record<string, unknown>) };
  }
  return p;
}
