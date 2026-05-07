import type { MCEvent } from '@managed-components/types';
import { str } from './utils';

const ATTRIBUTION_KEYS = [
  'attribution_share', 'campaign_id', 'adset_id', 'ad_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'first_campaign_id', 'first_adset_id', 'first_ad_id',
  'last_campaign_id', 'last_adset_id', 'last_ad_id'
];

export function getClickIds(event: MCEvent): Record<string, string> {
  const client = event.client;
  const url = client?.url;
  const clickIds: Record<string, string> = {};
  const pairs: Array<[string, string]> = [
    ['fbclid', 'fbclid'],
    ['gclid', 'gclid'],
    ['gbraid', 'gbraid'],
    ['wbraid', 'wbraid'],
    ['ttclid', 'ttclid'],
    ['li_fat_id', 'li_fat_id'],
    ['msclkid', 'msclkid'],
    ['twclid', 'twclid']
  ];
  for (const [param, key] of pairs) {
    const value = str(url?.searchParams?.get(param) || client?.get?.(key), 512);
    if (value) clickIds[key] = value;
  }
  return clickIds;
}

export function persistClickIds(event: MCEvent): void {
  const client = event.client;
  if (!client?.set) return;
  const clickIds = getClickIds(event);
  for (const [key, value] of Object.entries(clickIds)) {
    client.set(key, value, { scope: 'infinite' });
  }
}

export function getAttribution(event: MCEvent, defaultShare?: string | number): Record<string, string | number> {
  const payload = ((event.payload?.ecommerce as Record<string, unknown>) || event.payload || {}) as Record<string, unknown>;
  const client = event.client;
  const url = client?.url;
  const attribution: Record<string, string | number> = {};

  const share = payload.attribution_share || client?.get?.('attribution_share') || defaultShare;
  if (share !== undefined && share !== null && String(share) !== '') attribution.attribution_share = Number(share);

  for (const key of ['campaign_id', 'adset_id', 'ad_id']) {
    const value = str(
      payload[key] ||
      payload[`first_${key}`] ||
      client?.get?.(`first_${key}`) ||
      client?.get?.(key) ||
      url?.searchParams?.get(key),
      128
    );
    if (value) attribution[key] = value;
  }

  return attribution;
}

export function getMarketingParams(event: MCEvent): Record<string, string> {
  const payload = ((event.payload?.ecommerce as Record<string, unknown>) || event.payload || {}) as Record<string, unknown>;
  const client = event.client;
  const url = client?.url;
  const out: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = str(payload[key] || client?.get?.(key) || url?.searchParams?.get(key), 256);
    if (value) out[key] = value;
  }
  return out;
}

export function removeAttributionKeys(payload: Record<string, unknown>): Record<string, unknown> {
  const out = { ...payload };
  for (const key of ATTRIBUTION_KEYS) delete out[key];
  return out;
}
