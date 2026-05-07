import type { ComponentSettings, MCEvent } from '@managed-components/types';

export type Destination = 'ga4' | 'googleAds' | 'meta' | 'tiktok';

export type ZarazExtraSettings = ComponentSettings & {
  enabled?: boolean | string;
  debug?: boolean | string;
  debugVersion?: boolean | string;

  ga4MeasurementId?: string;
  ga4HideOriginalIP?: boolean | string;
  ga4Audiences?: boolean | string;
  ga4Disabled?: boolean | string;

  googleAdsConversionId?: string;
  googleAdsConversionLabel?: string;
  googleAdsGaAccount?: string;
  googleAdsEnableConversionLinker?: boolean | string;
  googleAdsDomains?: string;
  googleAdsDisabled?: boolean | string;

  metaPixelId?: string;
  metaAccessToken?: string;
  metaTestEventCode?: string;
  metaApiVersion?: string;
  metaHideClientIP?: boolean | string;
  metaDefaultAttributionShare?: string | number;
  metaDisabled?: boolean | string;

  tiktokPixelId?: string;
  tiktokAccessToken?: string;
  tiktokTestEventCode?: string;
  tiktokDisabled?: boolean | string;

  linkedinPartnerId?: string;
  linkedinConversionId?: string;
  linkedinDisabled?: boolean | string;

  storeVisitorState?: boolean | string;
  stateTtlDays?: string | number;
};

export type NormalizedProduct = {
  product_id?: string;
  sku?: string;
  id?: string;
  name?: string;
  category?: string;
  brand?: string;
  variant?: string;
  price?: number;
  quantity?: number;
  coupon?: string;
  position?: number;
  [key: string]: unknown;
};

export type NormalizedEvent = {
  sourceType: string;
  sourceName?: string;
  name: string;
  eventId: string;
  timestamp: number;
  url: string;
  referrer?: string;
  title?: string;
  userAgent?: string;
  ip?: string;
  language?: string;
  timezoneOffset?: number;
  value?: number;
  revenue?: number;
  total?: number;
  currency?: string;
  order_id?: string;
  transaction_id?: string;
  products: NormalizedProduct[];
  identity: Record<string, string>;
  attribution: Record<string, string | number>;
  clickIds: Record<string, string>;
  custom: Record<string, unknown>;
  raw: MCEvent;
};

export type VisitorStateRecord = {
  visitor_id: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  first_touch?: Record<string, unknown>;
  last_touch?: Record<string, unknown>;
  event_count: number;
  once?: Record<string, string>;
};
