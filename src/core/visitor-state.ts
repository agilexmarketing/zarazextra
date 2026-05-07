import type { Manager } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings, VisitorStateRecord } from './types';
import { enabled, sha256Hex, str } from './utils';

export async function enrichVisitorState(manager: Manager, event: NormalizedEvent, settings: ZarazExtraSettings): Promise<VisitorStateRecord | undefined> {
  if (!enabled(settings.storeVisitorState, true)) return undefined;
  const env = (manager as any).ext?.env;
  const binding = env?.ZARAZEXTRA_STATE;
  if (!binding) return undefined;

  const visitorId = await getOrSetVisitorId(event);
  if (!visitorId) return undefined;

  const id = binding.idFromName(visitorId);
  const stub = binding.get(id);
  const response = await stub.fetch('https://zarazextra/state', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'merge',
      visitor_id: visitorId,
      ttl_days: Number(settings.stateTtlDays || 7),
      touch: {
        url: event.url,
        referrer: event.referrer,
        event_name: event.name,
        event_id: event.eventId,
        timestamp: event.timestamp,
        click_ids: event.clickIds,
        attribution: event.attribution,
        custom: pickMarketing(event.custom)
      }
    })
  });
  if (!response.ok) return undefined;
  return await response.json() as VisitorStateRecord;
}

async function getOrSetVisitorId(event: NormalizedEvent): Promise<string | undefined> {
  const client = event.raw.client;
  const existing = client?.get?.('ze_vid');
  if (existing) return existing;
  const seed = event.identity.external_id || event.identity.em || event.identity.ph || event.clickIds.fbclid || event.clickIds.gclid || `${event.ip || ''}|${event.userAgent || ''}`;
  if (!seed.trim()) return undefined;
  const id = await sha256Hex(seed);
  client?.set?.('ze_vid', id, { scope: 'infinite' });
  return id;
}

function pickMarketing(custom: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campaign_id', 'adset_id', 'ad_id']) {
    const value = str(custom[key], 256);
    if (value) out[key] = value;
  }
  return out;
}
