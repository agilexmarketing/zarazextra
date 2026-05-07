import type { ComponentSettings, Manager, MCEvent } from '@managed-components/types';
import type { ZarazExtraSettings } from './core/types';
import { enabled } from './core/utils';
import { normalizeEvent } from './core/normalize-event';
import { enrichVisitorState } from './core/visitor-state';
import { sendGA4 } from './destinations/ga4';
import { handleGoogleAdsPageview, sendGoogleAds } from './destinations/google-ads';
import { sendMeta } from './destinations/meta';
import { sendTikTok } from './destinations/tiktok';

export default async function zarazExtra(manager: Manager, rawSettings: ComponentSettings) {
  const settings = rawSettings as ZarazExtraSettings;

  manager.addEventListener('pageview', async event => {
    if (!enabled(settings.enabled, true)) return;
    const normalized = normalizeEvent('pageview', event, settings);
    await enrichVisitorState(manager, normalized, settings);
    handleGoogleAdsPageview(normalized, settings);
    await Promise.allSettled([
      sendGA4(manager, normalized, settings),
      sendMeta(manager, normalized, settings),
      sendTikTok(manager, normalized, settings)
    ]);
  });

  manager.addEventListener('event', async event => {
    if (!enabled(settings.enabled, true)) return;
    const normalized = normalizeEvent('event', event, settings);
    await enrichVisitorState(manager, normalized, settings);
    await Promise.allSettled([
      sendGA4(manager, normalized, settings),
      sendMeta(manager, normalized, settings),
      sendTikTok(manager, normalized, settings)
    ]);
  });

  manager.addEventListener('ecommerce', async event => {
    if (!enabled(settings.enabled, true)) return;
    (event as any).payload ||= {};
    (event as any).payload.conversion = true;
    const normalized = normalizeEvent('ecommerce', event, settings);
    await enrichVisitorState(manager, normalized, settings);
    await Promise.allSettled([
      sendGA4(manager, normalized, settings),
      sendMeta(manager, normalized, settings),
      sendTikTok(manager, normalized, settings)
    ]);
  });

  manager.addEventListener('conversion', async event => {
    if (!enabled(settings.enabled, true)) return;
    const normalized = normalizeEvent('conversion', event, settings);
    await enrichVisitorState(manager, normalized, settings);
    await sendGoogleAds(manager, normalized, settings, 'conversion');
  });

  manager.addEventListener('remarketing', async event => {
    if (!enabled(settings.enabled, true)) return;
    const normalized = normalizeEvent('remarketing', event, settings);
    await enrichVisitorState(manager, normalized, settings);
    await sendGoogleAds(manager, normalized, settings, 'remarketing');
  });
}
