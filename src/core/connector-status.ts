import type { ZarazExtraSettings } from './types';
import { bool, has } from './utils';

type ConnectorStatus = {
  active: boolean;
  reason: string;
};

export type ConnectorsStatus = {
  meta: ConnectorStatus;
  tiktok: ConnectorStatus;
  ga4: ConnectorStatus;
  googleAds: ConnectorStatus;
  linkedin: ConnectorStatus;
};

export function getConnectorsStatus(settings: ZarazExtraSettings): ConnectorsStatus {
  const metaDisabled = bool(settings.metaDisabled);
  const tiktokDisabled = bool(settings.tiktokDisabled);
  const ga4Disabled = bool(settings.ga4Disabled);
  const googleAdsDisabled = bool(settings.googleAdsDisabled);
  const linkedinDisabled = bool(settings.linkedinDisabled);

  const metaCreds = has(settings.metaPixelId) && has(settings.metaAccessToken);
  const tiktokCreds = has(settings.tiktokPixelId) && has(settings.tiktokAccessToken);
  const ga4Creds = has(settings.ga4MeasurementId);
  const googleAdsCreds = has(settings.googleAdsConversionId) && has(settings.googleAdsConversionLabel);
  const linkedinCreds = has(settings.linkedinPartnerId) || has(settings.linkedinConversionId);

  return {
    meta: makeStatus(metaCreds, metaDisabled, 'metaPixelId + metaAccessToken', 'metaDisabled'),
    tiktok: makeStatus(tiktokCreds, tiktokDisabled, 'tiktokPixelId + tiktokAccessToken', 'tiktokDisabled'),
    ga4: makeStatus(ga4Creds, ga4Disabled, 'ga4MeasurementId', 'ga4Disabled'),
    googleAds: makeStatus(googleAdsCreds, googleAdsDisabled, 'googleAdsConversionId + googleAdsConversionLabel', 'googleAdsDisabled'),
    linkedin: makeStatus(linkedinCreds, linkedinDisabled, 'linkedinPartnerId or linkedinConversionId', 'linkedinDisabled')
  };
}

function makeStatus(hasCredentials: boolean, disabled: boolean, required: string, disabledKey: string): ConnectorStatus {
  if (disabled) return { active: false, reason: `${disabledKey}=true` };
  if (!hasCredentials) return { active: false, reason: `missing required credentials: ${required}` };
  return { active: true, reason: 'active from credentials' };
}
