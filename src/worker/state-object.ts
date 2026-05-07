import type { VisitorStateRecord } from '../core/types';

export class ZarazExtraState implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const body = await request.json().catch(() => null) as any;
    if (!body || !body.action) return json({ error: 'bad_request' }, 400);

    if (body.action === 'merge') return this.merge(body);
    if (body.action === 'get') return this.get(body.visitor_id);
    if (body.action === 'once') return this.once(body);

    return json({ error: 'unknown_action' }, 400);
  }

  private async get(visitorId: string): Promise<Response> {
    const record = await this.load(visitorId);
    return json(record);
  }

  private async merge(body: any): Promise<Response> {
    const visitorId = String(body.visitor_id || '');
    if (!visitorId) return json({ error: 'missing_visitor_id' }, 400);

    const now = new Date().toISOString();
    const record = await this.load(visitorId) || {
      visitor_id: visitorId,
      created_at: now,
      updated_at: now,
      event_count: 0,
      once: {}
    } as VisitorStateRecord;

    record.updated_at = now;
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
    const now = new Date().toISOString();
    const record = await this.load(visitorId) || {
      visitor_id: visitorId,
      created_at: now,
      updated_at: now,
      event_count: 0,
      once: {}
    } as VisitorStateRecord;
    record.once ||= {};
    if (record.once[key]) return json({ allowed: false, record });
    record.once[key] = now;
    record.updated_at = now;
    await this.state.storage.put(`visitor:${visitorId}`, record);
    return json({ allowed: true, record });
  }

  private async load(visitorId: string): Promise<VisitorStateRecord | undefined> {
    if (!visitorId) return undefined;
    return await this.state.storage.get<VisitorStateRecord>(`visitor:${visitorId}`);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
