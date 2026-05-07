import type { MCEvent, ComponentSettings } from '@managed-components/types';

export type InitBody = {
  settings: ComponentSettings;
  componentPath: string;
  permissions: string[];
  component: string;
  routePath?: string;
};

export type EventBody = InitBody & {
  event: MCEvent;
  clientData: Record<string, any>;
  eventType: string;
  debug?: boolean;
};

export type ZarazExtraEnv = {
  ZARAZEXTRA_STATE?: DurableObjectNamespace;
  KV?: KVNamespace;
};

export type ResponseContext = {
  fetch: Array<[string, RequestInit]>;
  execute: string[];
  return: Record<string, unknown>;
  pendingCookies: Record<string, { value: string | null | undefined; opts?: any }>;
  clientPrefs: Record<string, string[]>;
  serverFetch: Array<Record<string, unknown>>;
};

export type WorkerContext = {
  component: string;
  componentPath: string;
  routePath: string;
  permissions: string[];
  events: Record<string, Array<(event: MCEvent) => Promise<void> | void>>;
  clientEvents: Record<string, (event: MCEvent) => Promise<void> | void>;
  cookies: Record<string, string>;
  response: ResponseContext;
  env: ZarazExtraEnv;
  execContext: ExecutionContext;
  debug: boolean;
};
