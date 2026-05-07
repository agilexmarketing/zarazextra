import type { Manager } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings } from '../core/types';
import { ECOMMERCE_GA4_EVENTS, productId } from '../core/ecommerce';
import { bool, enabled, flattenKeys, getParamSafely, has, randomId, str, urlWithParam } from '../core/utils';

const PREFIX_PARAMS_MAPPING: Record<string, string> = {
  checkout_id: 'transaction_id',
  order_id: 'transaction_id',
  price: 'value',
  value: 'value',
  total: 'value',
  shipping: 'shipping',
  tax: 'tax',
  coupon: 'coupon',
  payment_type: 'payment_type',
  list_id: 'item_list_id',
  category: 'item_list_name',
  query: 'search_term',
  affiliation: 'affiliation',
  promotion_id: 'promotion_id',
  name: 'promotion_name',
  creative: 'creative_name',
  position: 'location_id',
  payment_method: 'payment_type'
};

const PRODUCT_DETAILS_MAPPING: Record<string, string> = {
  product_id: 'id',
  sku: 'id',
  id: 'id',
  name: 'nm',
  brand: 'br',
  category: 'ca',
  variant: 'va',
  price: 'pr',
  quantity: 'qt',
  coupon: 'cp'
};

export async function sendGA4(manager: Manager, event: NormalizedEvent, settings: ZarazExtraSettings): Promise<void> {
  const ga4Active = has(settings.ga4MeasurementId) && !bool(settings.ga4Disabled);
  if (!ga4Active) return;

  const client = event.raw.client;
  let eventsCounter = parseInt(client?.get?.('ze_ga4_counter') || '') || 0;
  eventsCounter++;
  client?.set?.('ze_ga4_counter', String(eventsCounter));

  let sessionCounter = parseInt(client?.get?.('ze_ga4_session_counter') || '') || 0;
  let sid = client?.get?.('ze_ga4_sid');
  const requestBody: Record<string, unknown> = {
    v: 2,
    tid: settings.ga4MeasurementId,
    sr: `${client?.screenWidth || ''}x${client?.screenHeight || ''}`,
    ul: event.language,
    _s: eventsCounter,
    ...getParamSafely('dt', [event.title]),
    ...getParamSafely('dr', [event.referrer]),
    ...getParamSafely('dl', [event.url])
  };

  if (!enabled(settings.ga4HideOriginalIP, false) && event.ip) requestBody._uip = event.ip;

  if (!sid) {
    sid = String(Math.floor(2147483647 * Math.random()));
    requestBody._ss = 1;
    sessionCounter++;
  }
  client?.set?.('ze_ga4_sid', sid, { expiry: 30 * 60 * 1000 });
  client?.set?.('ze_ga4_session_counter', String(sessionCounter), { scope: 'infinite' });
  requestBody.sid = sid;
  requestBody._p = sid;
  requestBody.sct = sessionCounter;

  let cid = client?.get?.('ze_ga4_cid');
  if (!cid) {
    cid = randomId();
    requestBody._fv = 1;
  }
  client?.set?.('ze_ga4_cid', cid, { scope: 'infinite' });
  requestBody.cid = event.custom.cid || cid;

  const gclid = event.clickIds.gclid || client?.get?.('gclid');
  if (gclid) {
    requestBody.gclid = gclid;
    if (requestBody.dl) requestBody.dl = urlWithParam(String(requestBody.dl), 'gclid', gclid);
  }

  const eventParams = buildGA4EventParams(event);
  const queryParams = new URLSearchParams({ ...requestBody, ...eventParams } as Record<string, string>).toString();
  const finalURL = `https://www.google-analytics.com/g/collect?${queryParams}`;
  manager.fetch(finalURL, { headers: { 'User-Agent': event.userAgent || '' } });
}

function buildGA4EventParams(event: NormalizedEvent): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  out.en = event.sourceType === 'ecommerce'
    ? (ECOMMERCE_GA4_EVENTS[event.sourceName || ''] || event.sourceName || 'ecommerce')
    : (event.custom.en || event.name || event.sourceType);

  if (event.currency) out.cu = event.currency;
  if (event.value !== undefined) out['epn.value'] = event.value;
  if (event.transaction_id) out['ep.transaction_id'] = event.transaction_id;

  for (const [key, param] of Object.entries(PREFIX_PARAMS_MAPPING)) {
    const v = (event.custom as Record<string, unknown>)[key] || (event as any)[key];
    if (v !== undefined && v !== null && v !== '') out[`${Number(v) ? 'epn' : 'ep'}.${param}`] = v;
  }

  if (event.products.length) {
    event.products.forEach((product, index) => {
      out[`pr${index + 1}`] = buildProductRequest(product as Record<string, unknown>);
    });
  }

  const builtIn = new Set(['tid', 'uid', 'en', 'ni', 'conversion', 'dr', 'dl', 'ir', 'dbg', 'gcs', 'gcd', 'cid', 'dt']);
  const flattened = flattenKeys(event.custom);
  for (const [key, value] of Object.entries(flattened)) {
    if (value === undefined || value === null || value === '') continue;
    if (builtIn.has(key) || key.startsWith('up.')) {
      out[key] = value;
      continue;
    }
    if (key.startsWith('first_') || key.startsWith('last_')) {
      out[`ep.${key}`] = String(value);
      continue;
    }
    if (typeof value === 'number' || Number(value)) out[`epn.${key}`] = value;
    else out[`ep.${key}`] = String(value);
  }

  return out;
}

function buildProductRequest(item: Record<string, unknown>): string {
  const allKeys: Record<string, string> = {};
  const source = { ...item, id: productId(item) };
  for (const [id, value] of Object.entries(source)) {
    const mapped = PRODUCT_DETAILS_MAPPING[id];
    if (!mapped || value === undefined || value === null || value === '') continue;
    allKeys[mapped] = prepare(String(value));
  }
  return Object.entries(allKeys).map(([key, val]) => `${key}${val}`).join('~');
}

function prepare(value: string): string {
  return str(value, 512).replace(/~/g, '~~');
}
