import type { Manager } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings } from '../core/types';
import { ECOMMERCE_META_EVENTS, productId } from '../core/ecommerce';
import { cleanObject, enabled, flattenKeys, sha256Hex, str } from '../core/utils';

const HASHED_USER_DATA = new Set(['em', 'ph', 'fn', 'ln', 'db', 'ge', 'ct', 'st', 'zp', 'country', 'external_id']);
const PLAIN_USER_DATA = new Set(['subscription_id', 'fb_login_id', 'lead_id']);

export async function sendMeta(manager: Manager, event: NormalizedEvent, settings: ZarazExtraSettings): Promise<void> {
  if (!enabled(settings.metaEnabled, !!settings.metaPixelId && !!settings.metaAccessToken)) return;
  if (!settings.metaPixelId || !settings.metaAccessToken) return;

  const payload = await buildMetaPayload(event, settings);
  const apiVersion = settings.metaApiVersion || 'v21.0';
  const endpoint = `https://graph.facebook.com/${apiVersion}/${settings.metaPixelId}/events`;
  const body = {
    data: [payload],
    access_token: settings.metaAccessToken,
    ...(settings.metaTestEventCode && { test_event_code: settings.metaTestEventCode })
  };

  manager.fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function buildMetaPayload(event: NormalizedEvent, settings: ZarazExtraSettings): Promise<Record<string, unknown>> {
  const fbp = getFBP(event);
  const fbc = getFBC(event);
  const eventName = event.sourceType === 'pageview'
    ? 'PageView'
    : event.sourceType === 'ecommerce'
      ? (ECOMMERCE_META_EVENTS[event.sourceName || ''] || event.sourceName || event.name)
      : (str(event.custom.ev, 128) || event.name || event.sourceType);

  const userData: Record<string, unknown> = cleanObject({
    fbp,
    fbc,
    ...(!enabled(settings.metaHideClientIP, false) && {
      client_user_agent: event.userAgent,
      client_ip_address: event.ip
    })
  });

  for (const [key, value] of Object.entries(event.identity)) {
    if (!value) continue;
    if (HASHED_USER_DATA.has(key)) userData[key] = await sha256Hex(value);
    else if (PLAIN_USER_DATA.has(key)) userData[key] = value;
  }

  const customData = buildMetaCustomData(event);
  const attributionData = cleanObject(event.attribution);

  return cleanObject({
    event_name: eventName,
    event_id: event.eventId,
    action_source: 'website',
    event_time: event.timestamp,
    event_source_url: event.url,
    user_data: userData,
    ...(Object.keys(attributionData).length > 0 && { attribution_data: attributionData }),
    custom_data: customData,
    original_event_data: {
      event_name: eventName,
      event_time: event.timestamp
    }
  });
}

function buildMetaCustomData(event: NormalizedEvent): Record<string, unknown> {
  const contents = event.products.map(p => cleanObject({
    id: productId(p),
    quantity: p.quantity || 1,
    item_price: p.price
  })).filter(x => Object.keys(x).length > 0);

  const contentIds = event.products.map(productId).filter(Boolean);
  const contentName = event.products.map(p => p.name).filter(Boolean).join(',');

  return cleanObject({
    currency: event.currency,
    value: event.value,
    order_id: event.order_id || event.transaction_id,
    content_type: event.products.length ? 'product' : undefined,
    content_ids: contentIds.length ? contentIds : undefined,
    content_name: contentName || undefined,
    contents: contents.length ? contents : undefined,
    num_items: event.products.length || undefined,
    ...flattenKeys(event.custom)
  });
}

function fbCookieBase(event: NormalizedEvent): string {
  let dots = 1;
  try {
    dots = new URL(event.url).hostname.split('.').length - 1;
  } catch {}
  return `fb.${dots}.${Date.now()}.`;
}

function getFBP(event: NormalizedEvent): string {
  const client = event.raw.client;
  let fbp = client?.get?.('fb-pixel') || client?.get?.('_fbp') || '';
  if (!fbp) {
    fbp = fbCookieBase(event) + String(Math.round(2147483647 * Math.random()));
    client?.set?.('fb-pixel', fbp, { scope: 'infinite' });
  }
  return fbp;
}

function getFBC(event: NormalizedEvent): string | undefined {
  const client = event.raw.client;
  let fbc = client?.get?.('fb-click') || client?.get?.('_fbc') || '';
  const fbclid = event.clickIds.fbclid;
  if (fbclid) {
    fbc = fbCookieBase(event) + fbclid;
    client?.set?.('fb-click', fbc, { scope: 'infinite' });
  }
  return fbc || undefined;
}
