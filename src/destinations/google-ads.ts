import type { Manager } from '@managed-components/types';
import type { NormalizedEvent, ZarazExtraSettings } from '../core/types';
import { bool, cleanObject, enabled, has, str, urlWithParam } from '../core/utils';

export function handleGoogleAdsPageview(event: NormalizedEvent, settings: ZarazExtraSettings): void {
  const googleAdsActive = has(settings.googleAdsConversionId) && has(settings.googleAdsConversionLabel) && !bool(settings.googleAdsDisabled);
  if (!googleAdsActive) return;
  setGclAwCookie(event);
  if (enabled(settings.googleAdsEnableConversionLinker, true) && settings.googleAdsDomains) runConversionLinker(event, settings);
}

export async function sendGoogleAds(manager: Manager, event: NormalizedEvent, settings: ZarazExtraSettings, mode: 'conversion' | 'remarketing' = 'conversion'): Promise<void> {
  const googleAdsActive = has(settings.googleAdsConversionId) && has(settings.googleAdsConversionLabel) && !bool(settings.googleAdsDisabled);
  if (!googleAdsActive) return;

  setGclAwCookie(event);
  const client = event.raw.client;
  const gclaw = client?.get?.('_gcl_aw')?.split('.').pop() || event.clickIds.gclid;
  let url = event.url;
  const rnd = Date.now() + getRandomInt(100, 1600000);

  if (gclaw) url = urlWithParam(url, 'gclid', gclaw);

  const query = cleanObject({
    guid: 'ON',
    rnd,
    fst: Date.now(),
    cv: 9,
    sendb: 1,
    num: 1,
    u_java: false,
    url,
    tiba: event.title,
    u_tz: -(event.timezoneOffset || 0),
    u_his: 10,
    u_h: event.raw.client?.viewportHeight,
    u_w: event.raw.client?.viewportWidth,
    u_ah: event.raw.client?.screenHeight,
    u_aw: event.raw.client?.screenWidth,
    ig: 1,
    ref: event.referrer,
    label: event.custom.label || settings.googleAdsConversionLabel,
    value: event.value,
    currency_code: event.currency,
    transaction_id: event.transaction_id || event.order_id,
    gclaw,
    gac: gclaw && settings.googleAdsGaAccount ? `${settings.googleAdsGaAccount}:${gclaw}` : undefined,
    ...event.custom
  });

  const params = new URLSearchParams(query as Record<string, string>).toString();
  const baseURL = mode === 'remarketing'
    ? 'https://www.google.com/pagead/1p-user-list'
    : 'https://www.googleadservices.com/pagead/conversion';
  const urls = [
    `${baseURL}/${settings.googleAdsConversionId}/?${params}`,
    `https://googleads.g.doubleclick.net/pagead/viewthroughconversion/${settings.googleAdsConversionId}/?${params}`
  ];

  if (gclaw) urls.unshift(`https://www.google.com/pagead/landing?gclid=${encodeURIComponent(gclaw)}&url=${encodeURIComponent(url)}&rnd=${rnd}`);

  for (const target of urls) {
    event.raw.client?.fetch?.(target, { credentials: 'include', mode: 'no-cors', keepalive: true });
  }
}

function setGclAwCookie(event: NormalizedEvent): void {
  const client = event.raw.client;
  const ts = Math.floor(Date.now() / 1000);
  const gclid = event.clickIds.gclid;
  if (gclid) client?.set?.('_gcl_aw', `GCL.${ts}.${gclid}`, { scope: 'infinite' });

  const glParam = event.raw.client?.url?.searchParams?.get('_gl');
  if (!glParam) return;
  const parts = glParam.split('*');
  const idx = parts.findIndex(part => part === '_gcl_aw');
  if (idx !== -1 && idx + 1 < parts.length) client?.set?.('_gcl_aw', `GCL.${ts}.${parts[idx + 1]}`, { scope: 'infinite' });
}

function runConversionLinker(event: NormalizedEvent, settings: ZarazExtraSettings): void {
  const domains = String(settings.googleAdsDomains || '').split(',').map(d => d.trim()).filter(Boolean);
  if (!domains.length) return;
  const code = `console.log('ZarazExtra Google Ads linker domains:', ${JSON.stringify(domains)});`;
  event.raw.client?.execute?.(code);
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}
