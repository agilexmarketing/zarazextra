import type { VisitorStateRecord } from '../core/types';

export class ZarazExtraState implements DurableObject {
  private state: DurableObjectState;
  private static readonly DEFAULT_TTL_DAYS = 7;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const body = await request.json().catch(() => null) as any;
    if (!body || !body.action) return json({ error: 'bad_request' }, 400);

    if (body.action === 'merge') return this.merge(body);
    if (body.action === 'get') return this.get(body);
    if (body.action === 'once') return this.once(body);

    return json({ error: 'unknown_action' }, 400);
  }

  private async get(body: any): Promise<Response> {
    const visitorId = String(body?.visitor_id || '');
    const ttlDays = this.resolveTtlDays(body?.ttl_days);
    const record = await this.load(visitorId, ttlDays);
    return json(record);
  }

  private async merge(body: any): Promise<Response> {
    const visitorId = String(body.visitor_id || '');
    if (!visitorId) return json({ error: 'missing_visitor_id' }, 400);
    const ttlDays = this.resolveTtlDays(body.ttl_days);

    const now = new Date().toISOString();
    const record = await this.load(visitorId, ttlDays) || {
      visitor_id: visitorId,
      created_at: now,
      updated_at: now,
      expires_at: this.computeExpiry(now, ttlDays),
      event_count: 0,
      once: {}
    } as VisitorStateRecord;

    record.updated_at = now;
    record.expires_at = this.computeExpiry(now, ttlDays);
    record.event_count = (record.event_count || 0) + 1;
    if (!record.first_touch && body.touch) record.first_touch = body.touch;
    if (body.touch) record.last_touch = body.touch;

    await this.state.storage.put(`visitor:${visitorId}`, record);
    return json(record);
  }

  private async once(body: any): Promise<Response> {
    const visitorId = String(body.visitor_id || '');
    const key = String(body.key || '');
    if (!visitorId || !key) return json({ error: 'missing_visitor_or_key' }, 400);
    const ttlDays = this.resolveTtlDays(body.ttl_days);
    const now = new Date().toISOString();
    const record = await this.load(visitorId, ttlDays) || {
      visitor_id: visitorId,
      created_at: now,
      updated_at: now,
      expires_at: this.computeExpiry(now, ttlDays),
      event_count: 0,
      once: {}
    } as VisitorStateRecord;
    record.once ||= {};
    if (record.once[key]) return json({ allowed: false, record });
    record.once[key] = now;
    record.updated_at = now;
    record.expires_at = this.computeExpiry(now, ttlDays);
    await this.state.storage.put(`visitor:${visitorId}`, record);
    return json({ allowed: true, record });
  }

  private async load(visitorId: string, ttlDays: number): Promise<VisitorStateRecord | undefined> {
    if (!visitorId) return undefined;
    const key = `visitor:${visitorId}`;
    const record = await this.state.storage.get<VisitorStateRecord>(key);
    if (!record) return undefined;

    const now = Date.now();
    const expiresAt = this.resolveExpiresAt(record, ttlDays);
    if (expiresAt <= now) {
      await this.state.storage.delete(key);
      return undefined;
    }
    return record;
  }

  private resolveTtlDays(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return ZarazExtraState.DEFAULT_TTL_DAYS;
    return Math.min(Math.floor(parsed), 3650);
  }

  private computeExpiry(baseIso: string, ttlDays: number): string {
    const expiresMs = new Date(baseIso).getTime() + ttlDays * 24 * 60 * 60 * 1000;
    return new Date(expiresMs).toISOString();
  }

  private resolveExpiresAt(record: VisitorStateRecord, ttlDays: number): number {
    const explicit = Date.parse(String(record.expires_at || ''));
    if (Number.isFinite(explicit)) return explicit;
    const fallbackBase = Date.parse(String(record.updated_at || record.created_at || ''));
    if (Number.isFinite(fallbackBase)) return fallbackBase + ttlDays * 24 * 60 * 60 * 1000;
    return 0;
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
