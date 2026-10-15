# IPMA for Gladys Assistant

An external integration for [Gladys Assistant](https://gladysassistant.com) that brings the
official weather of **Portugal** — mainland, Madeira and the Azores — from
[IPMA](https://www.ipma.pt) (Instituto Português do Mar e da Atmosfera): forecasts, station
observations, weather warnings, UV index and fire risk. For the family house over there, or for
living in Portugal.

**Not affiliated with IPMA.** The integration reads IPMA's free open data
(`api.ipma.pt`): no account, no API key.

> **Developed without a real Gladys instance and without network access to IPMA**: built and
> tested on real IPMA responses (see [Credits](#credits)). Feedback welcome — open an issue if a
> value looks wrong.

## What it does

- **One device per location**, among IPMA's 423 forecast locations (every municipality), picked in
  a list or as the location nearest to a house of Gladys. Up to 10 locations.
- On each device, read only:
  - the **closest weather station** (within 50 km): temperature, humidity, pressure, wind, rain of
    the last hour;
  - **today and tomorrow**: minimum, maximum, chance of rain, weather (translated);
  - **today**: wind (class and direction), UV index, fire risk (mainland only);
  - **warnings**: the level as a green / yellow / orange / red Gladys risk badge, and the warnings
    in words (or the next one to come).
- **Scene trigger** `warning_issued` — "IPMA weather warning issued", filtered by location, level
  and phenomenon, with the period and IPMA's text as variables. Fired once per warning (a raised
  level fires again), remembered across restarts in `/data`.
- **Dashboard widget** `forecast` — five days with weather icons, live temperature, UV, fire risk
  and the warnings (tap one for IPMA's text).
- **Configuration buttons** — "Use the location nearest to a house" and "Check IPMA now".
- Texts in **English, French, German and Spanish**.

The full user documentation, re-hosted by Gladys, is in [`docs/`](docs/en.md)
([en](docs/en.md), [fr](docs/fr.md), [de](docs/de.md), [es](docs/es.md)).

## Requirements

- Gladys **5.2.0** or later (the house select of the "nearest location" button).
- Internet access from Gladys to `api.ipma.pt` (HTTPS).

## Installation

In Gladys: **Integrations → Install from GitHub**, then enter `guim31/gladys-ipma` (or install it
from the store once listed). In the configuration screen, choose a location, save, then add its
device in the **Discover** tab.

## How it works

The container refreshes itself on its own timer (15, 30 or 60 minutes), without relying on Gladys
polling (GladysAssistant/Gladys#3198); `onPoll` stays as a fallback. Each refresh reads five IPMA
files — stations (cached a day), observations of the last 24 h, warnings, today's fire risk, and
one forecast per location — and only for the locations whose device was added to Gladys. Only the
values that changed are published, plus a heartbeat every 6 hours.

| File                                                           | Content                                 |
| -------------------------------------------------------------- | --------------------------------------- |
| `public-data/forecast/aggregate/<id>.json`                     | 10-day forecast of one location         |
| `open-data/observation/meteorology/stations/stations.json`     | weather stations                        |
| `open-data/observation/meteorology/stations/observations.json` | last 24 hours of every station (≈ 1 MB) |
| `open-data/forecast/warnings/warnings_www.json`                | warnings of every area                  |
| `open-data/forecast/meteorology/rcm/rcm-d0.json`               | today's fire risk of every municipality |

```
index.js                 SDK wiring only
src/app.js               handlers registered on the Gladys client, configuration
src/ipma.js              IPMA client and parsers (-99 = no value)
src/locations.js         the 423 IPMA locations (src/locations-data.js, generated)
src/snapshot.js          what a location shows now, from the parsed files
src/device.js            the device, its features and their states
src/refresher.js         the container's refresh timer, caches, onPoll fallback
src/warnings.js          the warning_issued scene trigger, remembered in /data
src/widgets.js           the forecast widget
src/actions.js           the configuration buttons
src/codes.js, src/i18n.js  IPMA codes and texts in four languages
scripts/probe.mjs        read the real IPMA data of a location, without Gladys
scripts/build-locations.mjs  regenerate the location table and the manifest select
```

## Development

```bash
npm install
npm test                       # node --test, on the SDK's fake Gladys and IPMA fixtures
npm run lint
npm run format:check
node scripts/probe.mjs Aveiro  # the real IPMA data of a location (needs Internet)
npx github:GladysAssistant/integration-store .   # store admission checks
```

Releases go through **Actions → Release** (it bumps the versions, the changelog, the tag and the
image). The hand-pushed tag path (`git tag vX.Y.Z && git push --tags`) only builds the image and
the GitHub Release: bump `version` in `package.json` and in the manifest (with the `docker_image`
tag) before tagging.

## Limits

- Portugal only; no fire risk on Madeira and the Azores (IPMA forecasts it for the mainland only).
- The forecast file is the one of IPMA's website (`public-data`), like the Home Assistant
  integration: IPMA may change it without notice.
- IPMA writes its warning texts in Portuguese: level and phenomenon are translated, the free text
  is not.
- Station values need a station within 50 km with a record of the last 3 hours (not always the
  case on small islands).

## Credits

- Data: © [IPMA](https://www.ipma.pt), open data, reused with attribution.
- [`pyipma`](https://github.com/dgomes/pyipma) by Diogo Gomes (MIT): the API knowledge and the real
  responses used as test fixtures.
- The [Home Assistant `ipma` integration](https://github.com/home-assistant/core/tree/dev/homeassistant/components/ipma)
  (Apache-2.0): the endpoints and the warning samples of its tests.
- Built from the official
  [Gladys integration template](https://github.com/GladysAssistant/integration-template-js) and
  [SDK](https://github.com/GladysAssistant/integration-sdk-js).

## License

[Apache-2.0](LICENSE)
