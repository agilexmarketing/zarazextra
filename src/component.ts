import type { ComponentSettings, Manager, MCEvent } from '@managed-components/types';
import type { ZarazExtraSettings } from './core/types';
import { bool, enabled } from './core/utils';
import { normalizeEvent } from './core/normalize-event';
import { enrichVisitorState } from './core/visitor-state';
import { sendGA4 } from './destinations/ga4';
import { handleGoogleAdsPageview, sendGoogleAds } from './destinations/google-ads';
import { sendMeta } from './destinations/meta';
import { sendTikTok } from './destinations/tiktok';
import { ZARAZEXTRA_NAME, ZARAZEXTRA_VERSION } from './version';

export default async function zarazExtra(manager: Manager, rawSettings: ComponentSettings) {
  const settings = rawSettings as ZarazExtraSettings;

  manager.addEventListener('pageview', async event => {
    if (!enabled(settings.enabled, true)) return;
    if (bool(settings.debugVersion)) {
      event.client?.return?.({
        component: ZARAZEXTRA_NAME,
        version: ZARAZEXTRA_VERSION
      });
    }
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
