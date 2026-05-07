import type { MCEvent } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings } from './types';
import { normalizeProducts, valueFrom } from './ecommerce';
import { getAttribution, getClickIds, getMarketingParams, persistClickIds, removeAttributionKeys } from './attribution';
import { getIdentity, removeIdentityKeys } from './identity';
import { num, randomId, str, unixSeconds, upperCurrency } from './utils';

const INTERNAL_KEYS = new Set([
  'event_id', 'ecommerce', 'conversion', 'debug', 'hideOriginalIP', 'ga-audiences',
  'conversionId', 'accessToken', 'property', 'pixelId', 'testKey', 'testEventCode'
]);

export function normalizeEvent(sourceType: string, event: MCEvent, settings: ZarazExtraSettings): NormalizedEvent {
  persistClickIds(event);

  const ecommercePayload = (event.payload?.ecommerce || {}) as Record<string, unknown>;
  const rootPayload = (event.payload || {}) as Record<string, unknown>;
  const payload = sourceType === 'ecommerce' ? ecommercePayload : rootPayload;
  const eventId = str(rootPayload.event_id || ecommercePayload.event_id, 128) || randomId('ze');
  const value = valueFrom(payload) ?? num(rootPayload.value);
  const currency = upperCurrency(payload.currency || rootPayload.currency);
  const rawCustom = { ...payload };
  delete rawCustom.products;
  const cleanCustom = removeAttributionKeys(removeIdentityKeys(rawCustom));
  for (const key of INTERNAL_KEYS) delete cleanCustom[key];

  const eventName = str(rootPayload.ev || rootPayload.en || event.name || event.type || sourceType, 128);

  return {
    sourceType,
    sourceName: event.name,
    name: eventName,
    eventId,
    timestamp: unixSeconds(event.client?.timestamp),
    url: event.client?.url?.href || str(rootPayload.dl) || '',
    referrer: event.client?.referer || str(rootPayload.dr) || undefined,
    title: event.client?.title || str(rootPayload.dt) || undefined,
    userAgent: event.client?.userAgent,
    ip: event.client?.ip,
    language: event.client?.language,
    timezoneOffset: event.client?.timezoneOffset,
    value,
    revenue: num(payload.revenue),
    total: num(payload.total),
    currency,
    order_id: str(payload.order_id || payload.checkout_id || rootPayload.order_id, 128) || undefined,
    transaction_id: str(payload.transaction_id || payload.order_id || payload.checkout_id || rootPayload.transaction_id, 128) || undefined,
    products: normalizeProducts(payload),
    identity: getIdentity(event, '40'),
    attribution: getAttribution(event, settings.metaDefaultAttributionShare),
    clickIds: getClickIds(event),
    custom: { ...cleanCustom, ...getMarketingParams(event) },
    raw: event
  };
}
