import type { ComponentSettings, MCEvent, Manager as MCManager } from '@managed-components/types';
import type { WorkerContext } from './context';

export class ZarazExtraManager implements MCManager {
  component: string;
  name = 'ZarazExtra Custom MC Manager';
  ext: Record<string, any>;
  private context: WorkerContext;

  constructor(context: WorkerContext) {
    this.context = context;
    this.component = context.component;
    this.ext = { env: context.env };
  }

  addEventListener(type: string, callback: (event: MCEvent) => Promise<void> | void): boolean {
    this.context.events[type] ||= [];
    this.context.events[type].push(callback);
    return true;
  }

  createEventListener(type: string, callback: (event: MCEvent) => Promise<void> | void): boolean {
    this.context.clientEvents[type] = callback;
    return true;
  }

  fetch(resource: string, settings?: RequestInit): Promise<Response> {
    const promise = fetch(resource, settings || {});
    this.context.execContext.waitUntil(promise.catch(() => undefined));
    if (this.context.debug) {
      this.context.response.serverFetch.push({
        resource,
        method: settings?.method || 'GET',
        body: settings?.body ? String(settings.body).slice(0, 2048) : undefined
      });
    }
    return promise;
  }

  async get(key: string): Promise<unknown> {
    return this.context.env.KV?.get(`${this.component}__${key}`, 'json');
  }

  async set(key: string, value: unknown): Promise<boolean> {
    this.context.execContext.waitUntil(this.context.env.KV?.put(`${this.component}__${key}`, JSON.stringify(value)) || Promise.resolve());
    return true;
  }

  route(): string | undefined { return undefined; }
  proxy(): string | undefined { return undefined; }
  serve(): string | undefined { return undefined; }
  useCache(): Promise<any> { return Promise.resolve(undefined); }
  async invalidateCache(): Promise<void> {}
  registerEmbed(): boolean { return false; }
  registerWidget(): boolean { return false; }
}

export type ComponentCallback = (manager: MCManager, settings: ComponentSettings) => Promise<void> | void;
