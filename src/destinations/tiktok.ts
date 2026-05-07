import type { Manager } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings } from '../core/types';
import { ECOMMERCE_TIKTOK_EVENTS, productId } from '../core/ecommerce';
import { bool, cleanObject, has, sha256Hex, str } from '../core/utils';

export async function sendTikTok(manager: Manager, event: NormalizedEvent, settings: ZarazExtraSettings): Promise<void> {
  const tiktokActive = has(settings.tiktokPixelId) && has(settings.tiktokAccessToken) && !bool(settings.tiktokDisabled);
  if (!tiktokActive) return;

  const body = await buildTikTokPayload(event, settings);
  manager.fetch('https://business-api.tiktok.com/open_api/v1.2/pixel/track/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': settings.tiktokAccessToken
    },
    body: JSON.stringify(body)
  });
}

async function buildTikTokPayload(event: NormalizedEvent, settings: ZarazExtraSettings): Promise<Record<string, unknown>> {
  const eventName = event.sourceType === 'pageview'
    ? 'ViewContent'
    : event.sourceType === 'ecommerce'
      ? (ECOMMERCE_TIKTOK_EVENTS[event.sourceName || ''] || event.sourceName || event.name)
      : event.name;

  const ttclid = getTTCLID(event);
  const user: Record<string, unknown> = cleanObject({
    external_id: event.identity.external_id,
    phone_number: event.identity.ph ? await sha256Hex(event.identity.ph) : undefined,
    email: event.identity.em ? await sha256Hex(event.identity.em) : undefined,
    ttp: getTTP(event)
  });

  return cleanObject({
    pixel_code: settings.tiktokPixelId,
    event: eventName,
    event_id: event.eventId,
    timestamp: new Date(event.timestamp * 1000).toISOString(),
    ...(settings.tiktokTestEventCode && { test_event_code: settings.tiktokTestEventCode }),
    context: cleanObject({
      ad: ttclid ? { callback: ttclid } : undefined,
      ip: event.ip,
      user_agent: event.userAgent,
      page: cleanObject({ url: event.url, referrer: event.referrer }),
      user
    }),
    properties: buildTikTokProperties(event)
  });
}

function buildTikTokProperties(event: NormalizedEvent): Record<string, unknown> {
  const contents = event.products.map(p => cleanObject({
    content_type: 'product',
    content_id: productId(p),
    content_name: p.name,
    quantity: p.quantity || 1,
    price: p.price
  })).filter(x => Object.keys(x).length > 0);

  return cleanObject({
    currency: event.currency,
    value: event.value,
    contents,
    content_type: contents.length ? 'product' : undefined,
    order_id: event.order_id || event.transaction_id,
    ...event.custom
  });
}

function getTTCLID(event: NormalizedEvent): string | undefined {
  const client = event.raw.client;
  const ttclid = event.clickIds.ttclid || client?.get?.('tk-click') || '';
  if (event.clickIds.ttclid) client?.set?.('tk-click', event.clickIds.ttclid, { scope: 'infinite' });
  return str(ttclid, 512) || undefined;
}

function getTTP(event: NormalizedEvent): string {
  const client = event.raw.client;
  let ttp = client?.get?.('_ttp');
  if (!ttp) {
    ttp = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    client?.set?.('_ttp', ttp, { scope: 'infinite' });
  }
  return ttp;
}
