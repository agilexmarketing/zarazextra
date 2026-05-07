import zarazExtra from './component';
import { ZarazExtraState } from './worker/state-object';
import { ZarazExtraClient } from './worker/client';
import { ZarazExtraManager } from './worker/manager';
import type { EventBody, InitBody, ZarazExtraEnv, WorkerContext } from './worker/context';
import { ZARAZEXTRA_NAME, ZARAZEXTRA_VERSION } from './version';

export { ZarazExtraState };

export default {
  async fetch(request: Request, env: ZarazExtraEnv, execContext: ExecutionContext): Promise<Response> {
    return handleManagedComponentRequest(request, env, execContext);
  }
};

async function handleManagedComponentRequest(request: Request, env: ZarazExtraEnv, execContext: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (url.pathname.endsWith('/version') || url.pathname === '/version') {
      return json({ name: ZARAZEXTRA_NAME, version: ZARAZEXTRA_VERSION });
    }
    return json({ ok: true, component: ZARAZEXTRA_NAME, version: ZARAZEXTRA_VERSION, endpoint: 'Custom Managed Component' });
  }

  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: InitBody | EventBody;
  try {
    body = await request.json() as InitBody | EventBody;
  } catch (error) {
    return json({ error: 'invalid_json', message: String(error) }, 400);
  }

  const context = createContext(body, env, execContext, Boolean((body as EventBody).debug));
  const manager = new ZarazExtraManager(context);
  await zarazExtra(manager as any, body.settings || {});

  if (url.pathname.endsWith('/init') || url.pathname === '/init') {
    return json({
      component: context.component,
      componentPath: context.componentPath,
      routePath: context.routePath,
      events: Object.keys(context.events),
      clientEvents: Object.keys(context.clientEvents),
      mappedEndpoints: [],
      fetch: [],
      execute: [],
      pendingCookies: {},
      clientPrefs: {},
      serverFetch: []
    });
  }

  if (url.pathname.endsWith('/event') || url.pathname === '/event') {
    const eventBody = body as EventBody;
    context.cookies = eventBody.clientData?.cookies || {};
    const event = eventBody.event;
    event.client = new ZarazExtraClient(eventBody.clientData || {}, context) as any;

    const listeners = context.events[eventBody.eventType] || [];
    await Promise.all(listeners.map(listener => listener(event)));

    return json({
      componentPath: context.componentPath,
      ...context.response
    });
  }

  return json({ error: 'not_found' }, 404);
}

function createContext(body: InitBody | EventBody, env: ZarazExtraEnv, execContext: ExecutionContext, debug: boolean): WorkerContext {
  return {
    component: body.component || 'zarazextra',
    componentPath: body.componentPath || 'zarazextra',
    routePath: body.routePath || '',
    permissions: body.permissions || [],
    events: {},
    clientEvents: {},
    cookies: {},
    debug,
    env,
    execContext,
    response: {
      fetch: [],
      execute: [],
      return: {},
      pendingCookies: {},
      clientPrefs: {},
      serverFetch: []
    }
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
