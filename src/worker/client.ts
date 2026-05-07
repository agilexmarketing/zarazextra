import type { Client as MCClient } from '@managed-components/types';
import type { WorkerContext } from './context';
import { hasPermission } from './permissions';

export class ZarazExtraClient implements MCClient {
  emitter: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportHeight?: number;
  viewportWidth?: number;
  userAgent: string;
  timezoneOffset?: number;
  language: string;
  referer: string;
  ip: string;
  title?: string;
  timestamp?: number;
  url: URL;

  private context: WorkerContext;

  constructor(clientData: Record<string, any>, context: WorkerContext) {
    this.context = context;
    this.url = new URL(clientData.url || 'https://example.com/');
    this.title = clientData.title;
    this.timestamp = clientData.timestamp;
    this.userAgent = clientData.userAgent || '';
    this.language = clientData.language || '';
    this.referer = clientData.referer || '';
    this.ip = clientData.ip || '';
    this.timezoneOffset = parseInt(clientData.timezoneOffset || '0');
    this.emitter = clientData.emitter || '';
    this.screenWidth = clientData.screenWidth;
    this.screenHeight = clientData.screenHeight;
    this.viewportWidth = clientData.viewportWidth;
    this.viewportHeight = clientData.viewportHeight;
  }

  fetch(resource: string, settings?: RequestInit): boolean | undefined {
    if (!hasPermission('client_network_requests', this.context.permissions)) return undefined;
    this.context.response.fetch.push([resource, settings || {}]);
    return true;
  }

  execute(code: string): boolean | undefined {
    if (!hasPermission('execute_unsafe_scripts', this.context.permissions)) return undefined;
    this.context.response.execute.push(code);
    return true;
  }

  return(value: unknown): void {
    this.context.response.return[this.context.componentPath] = value;
  }

  set(key: string, value: string | null | undefined, opts?: any): boolean | undefined {
    if (!hasPermission('access_client_kv', this.context.permissions)) return undefined;
    const cookieKey = `${this.context.componentPath}__${key}`;
    if (value === undefined || value === null) delete this.context.cookies[cookieKey];
    else this.context.cookies[cookieKey] = value;
    this.context.response.pendingCookies[cookieKey] = { value, opts };
    return true;
  }

  get(key: string): string | undefined {
    if (!hasPermission('access_client_kv', this.context.permissions)) return undefined;
    const cookieKey = `${this.context.componentPath}__${key}`;
    return this.context.cookies[cookieKey];
  }

  attachEvent(event: string): void {
    this.context.response.clientPrefs[this.context.componentPath] ||= [];
    this.context.response.clientPrefs[this.context.componentPath].push(event);
  }

  detachEvent(event: string): void {
    const prefs = this.context.response.clientPrefs[this.context.componentPath];
    if (!prefs) return;
    const index = prefs.indexOf(event);
    if (index >= 0) prefs.splice(index, 1);
  }
}
