# ZarazExtra

ZarazExtra is an advanced **Cloudflare Zaraz Custom Managed Component** that routes, normalizes, enriches, and forwards events to multiple marketing destinations from one self-contained Worker.

It is designed for teams that want more control than the native Zaraz tools provide, while still keeping the tracking layer inside Cloudflare/Zaraz.

## Destinations

ZarazExtra currently supports:

- **Google Analytics 4** using the `/g/collect` endpoint, without GA4 API secret.
- **Google Ads** conversion and remarketing endpoints.
- **Meta/Facebook Conversions API**, including `user_data`, `custom_data`, and `attribution_data`.
- **TikTok Events API**.

## Features

- Single Custom Managed Component for multiple destinations.
- Durable Object visitor state.
- First-touch and last-touch attribution helpers.
- Meta `attribution_data` support for `campaign_id`, `adset_id`, `ad_id`, and `attribution_share`.
- Persistent click IDs: `fbclid`, `gclid`, `gbraid`, `wbraid`, `ttclid`, `li_fat_id`, `msclkid`, `twclid`.
- Identity enrichment for email, phone, first name, last name, country, city, state, zip, and external IDs.
- GA4 ecommerce mapping compatible with Zaraz ecommerce events.
- Meta and TikTok server-side event forwarding.
- Google Ads client-side conversion fetches and linker helper.
- GitHub Actions auto-update workflow for installs made through Deploy to Cloudflare.

## Deploy to Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/agilexmarketing/zarazextra)

Markdown for this button:

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/agilexmarketing/zarazextra)
```

The Worker name is defined in `wrangler.toml`:

```toml
name = "custom-mc-zarazextra"
```

The `custom-mc-` prefix is required so the Worker appears in Zaraz as a Custom Managed Component.

## Manual deploy

```bash
npm install
npm run build
npm run deploy
```

## Zaraz setup

In Cloudflare:

```text
Zaraz → Tools Configuration → Add new tool → Custom Managed Component → custom-mc-zarazextra
```

Recommended permissions:

```text
Server network requests
Client key-value store
Client network requests
Execute client-side JavaScript
```

Recommended action types/listeners:

```text
pageview
plugin event / event
ecommerce
conversion
remarketing
```

## Settings

All settings are plain Custom Managed Component settings in Zaraz.

### Global

```text
enabled = true
debug = false
storeVisitorState = true
stateTtlDays = 180
```

### Google Analytics 4

```text
ga4Enabled = true
ga4MeasurementId = G-XXXXXXXXXX
ga4HideOriginalIP = false
```

### Google Ads

```text
googleAdsEnabled = true
googleAdsConversionId = AW-XXXXXXXXX or XXXXXXXXX
googleAdsConversionLabel = abc123
googleAdsGaAccount = G-XXXXXXXXXX or UA-XXXXXX-Y
googleAdsDomains = example.com,checkout.example.com
```

### Meta/Facebook

```text
metaEnabled = true
metaPixelId = 123456789012345
metaAccessToken = EAAB...
metaTestEventCode = TEST12345
metaApiVersion = v21.0
metaHideClientIP = false
metaDefaultAttributionShare = 1
```

### TikTok

```text
tiktokEnabled = true
tiktokPixelId = CXXXXXXXXXXXXXX
tiktokAccessToken = your_access_token
tiktokTestEventCode = TEST12345
```

## Event routing

```text
pageview    → GA4 + Meta + TikTok + Google Ads linker
plugin event / event → GA4 + Meta + TikTok
ecommerce   → GA4 + Meta + TikTok
conversion  → Google Ads conversion
remarketing → Google Ads remarketing
```

## Meta attribution_data

ZarazExtra sends these fields into Meta `attribution_data`, not `custom_data`:

```json
{
  "attribution_share": 1,
  "campaign_id": "123",
  "adset_id": "456",
  "ad_id": "789"
}
```

You can pass them directly in `zaraz.track()` / `zaraz.ecommerce()`, or persist them with:

```text
snippets/first-touch-attribution.html
```

## Identity enrichment

ZarazExtra reads identity from event payload and client KV:

```text
em / email
ph / phone / phone_number
fn / first_name
ln / last_name
ct / city
st / state
zp / zip / postal_code
country
external_id
subscription_id
fb_login_id
lead_id
db
ge
```

Optional helper:

```text
snippets/identity-capture.html
```

This snippet captures email, phone, first name and last name from form fields on `blur` and `submit`, then persists them with:

```js
zaraz.set(key, value, { scope: 'persist' })
```

## Durable Object visitor state

`wrangler.toml` declares:

```toml
[[durable_objects.bindings]]
name = "ZARAZEXTRA_STATE"
class_name = "ZarazExtraState"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["ZarazExtraState"]
```

The Durable Object stores:

```text
visitor_id
first_touch
last_touch
event_count
once flags
```

## Auto-update

This repository includes:

```text
.github/workflows/auto-update.yml
```

When the repository is installed through Deploy to Cloudflare, Cloudflare clones the repo into the user's GitHub/GitLab account and connects it to Workers Builds. The included workflow can periodically sync that installed repo from your upstream repository and push changes. That push triggers Cloudflare Workers Builds and redeploys the Worker.

The workflow already points to the upstream repository:

```text
https://github.com/agilexmarketing/zarazextra.git
```

## Development

```bash
npm install
npm run check
npm run build
```

## Project structure

```text
src/component.ts                 Managed Component event listeners
src/worker.ts                    Cloudflare Worker wrapper
src/worker/state-object.ts       Durable Object state
src/core/*                       normalization, identity, attribution, ecommerce
src/destinations/*               GA4, Google Ads, Meta, TikTok
snippets/*                       optional Zaraz Custom HTML helpers
```

## License

MIT
