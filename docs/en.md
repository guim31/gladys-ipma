# IPMA

The official weather of **Portugal** — mainland, Madeira and the Azores — in Gladys, from
[IPMA](https://www.ipma.pt) (Instituto Português do Mar e da Atmosfera), the Portuguese weather
service: forecasts, station observations, weather warnings, UV index and fire risk. For the family
house over there, or simply for living in Portugal.

The integration reads IPMA's free open data: no account, no API key. It is not affiliated with
IPMA.

> Developed without a real Gladys instance and without network access to IPMA: it was built and
> tested on real IPMA responses published by the `pyipma` library. Feedback welcome — open an issue
> on GitHub if a value looks wrong.

## What you get

- **One device per location** (a municipality, among IPMA's 423 forecast locations), named
  `IPMA <location>`, with:
  - the current temperature, humidity, pressure, wind and rain of the **closest weather station**;
  - today's and tomorrow's **minimum and maximum**, **chance of rain** and **weather**;
  - today's **wind** (strength and direction) and **UV index**;
  - today's **fire risk** (mainland only);
  - the **warning level** (green, yellow, orange, red) and the current **warnings** in words.
- A **dashboard widget**: five-day forecast with weather icons, live temperature, UV, fire risk and
  the warnings.
- A **scene trigger** "IPMA weather warning issued", with the level, the phenomenon and the period.

Everything is read only: nothing in Gladys can change anything at IPMA.

## Requirements

- Gladys **5.2.0** or later.
- Internet access from Gladys to `api.ipma.pt` (HTTPS).
- Nothing else: no account, no key.

## Configuration

### Settings

| Setting                         | What it does                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Location                        | The IPMA location to follow: a municipality of mainland Portugal, Madeira or the Azores (Portuguese names, with the district or island).                                                           |
| Other locations                 | Optional. More locations, separated by commas: `Funchal, Ponta Delgada, Lagoa (Faro)`. Names are matched without accents or case; add the district when a name is ambiguous. 10 locations at most. |
| Refresh interval                | 15 minutes, 30 minutes (default) or 1 hour.                                                                                                                                                        |
| Language of the names and texts | Language of the feature names of new devices, of the weather and warning texts and of the scene variables. French by default.                                                                      |

Then open the **Discover** tab and add the device of each location. The values arrive within
seconds.

### Location nearest to a house

The **Use the location nearest to a house** button picks the IPMA location closest to a house of
Gladys and saves it as the main location. Gladys asks, at installation, to share the position of
the houses with the integration: it is read only when you press this button, and never written in
the logs. A house more than 60 km away from any IPMA location (a house in France, for instance) is
refused: IPMA only covers Portugal.

## The device

| Feature                             | Type in Gladys        | Source                                                                  |
| ----------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| Temperature (station)               | temperature, °C       | closest IPMA station (within 50 km), last hourly record of the last 3 h |
| Humidity (station)                  | humidity, %           | same station                                                            |
| Pressure (station)                  | pressure, hPa         | same station (not every station measures it)                            |
| Wind (station)                      | speed, km/h           | same station                                                            |
| Rain last hour (station)            | precipitation, mm/h   | same station (not every station has a rain gauge)                       |
| Min / Max today, Min / Max tomorrow | minimum / maximum, °C | IPMA forecast of the location                                           |
| Chance of rain today / tomorrow     | counter, %            | IPMA forecast                                                           |
| Weather today / tomorrow            | text                  | IPMA weather type, translated ("Light rain or drizzle")                 |
| Wind today                          | text                  | IPMA wind class and direction ("Moderate, NW")                          |
| UV index                            | UV index              | IPMA forecast, maximum of the day                                       |
| Fire risk (1-5)                     | counter               | IPMA RCM: 1 low, 2 moderate, 3 high, 4 very high, 5 maximum (mainland)  |
| Warning level                       | risk level            | highest warning on now: 0 none (green), 1 yellow, 2 orange, 3 red       |
| Weather warnings                    | text                  | "Orange: Rough sea · Yellow: Wind", or the next warning to come         |

The warning level uses the Gladys **risk** badge: green, yellow, orange, red — IPMA's own colours.
A value IPMA does not give (no station nearby, no UV forecast for that day) is simply not updated.
The weather texts follow the language of the configuration; the feature names are set when the
device is added.

## Dashboard widget

Add the **IPMA forecast** widget to a dashboard and choose the location (empty: the first one).
It shows:

- the station used and the time of its last record;
- the live temperature, the UV index, the fire risk and the warning level;
- the warnings not over yet (ongoing or upcoming), with IPMA's text (in Portuguese) when tapped;
- five days: weather with its icon, minimum / maximum, chance of rain.

## Scene trigger

**IPMA weather warning issued** fires once for each warning IPMA issues for a location — often the
day before it starts. A warning raised to a higher level (yellow to orange) fires again. A restart
of the integration does not fire the same warnings again.

Filters: the location (device), the levels (yellow, orange, red), the phenomena (rain,
thunderstorms, wind, rough sea, hot weather, cold weather, snow, fog, other).

Variables for the next actions of the scene:

| Variable           | Example                    |
| ------------------ | -------------------------- |
| `location`         | `Aveiro`                   |
| `level`            | `orange`                   |
| `level_label`      | `Orange`                   |
| `phenomenon`       | `coastal`                  |
| `phenomenon_label` | `Rough sea`                |
| `starts_at`        | `2022-07-29T05:00:00.000Z` |
| `ends_at`          | `2022-07-29T20:00:00.000Z` |
| `active`           | `false` (not started yet)  |
| `description`      | IPMA's text, in Portuguese |

## Configuration buttons

- **Use the location nearest to a house**: see above.
- **Check IPMA now**: reads IPMA for every configured location (added to Gladys or not) and says
  what came back: station temperature, today's minimum and maximum, number of warnings, unknown
  location names, unreachable files.

## Scene examples

- **Storm at the family house**: trigger "IPMA weather warning issued", location Aveiro, levels
  orange and red → send a message built with the `level_label`, `phenomenon_label` and `location`
  variables: "IPMA Orange warning in Aveiro: Rough sea".
- **Heat wave**: trigger "IPMA weather warning issued", phenomenon hot weather → remind the
  neighbour to water the garden.
- **Fire risk**: when the "Fire risk (1-5)" feature goes above 3 → notification "no barbecue
  today".
- **Chance of rain**: every evening at 20:00, if "Chance of rain tomorrow" is above 70 % → close
  the awning.

## Data and refresh

The integration refreshes itself (it does not depend on Gladys polling): every 15, 30 or
60 minutes it reads five IPMA files — the stations (once a day), the observations of the last
24 hours, the warnings, today's fire risk, and one forecast per location. These files cover the whole
country, so ten locations cost ten forecast files plus four shared ones per refresh. IPMA
publishes no quota for its open data; the integration stays far below what its own website loads.
Nothing is read for a location whose device is not added to Gladys.

IPMA updates its forecasts a few times a day, its stations once an hour and its warnings as
needed. An unchanged value is sent again to Gladys every 6 hours, so it never shows "no recent
value". The data is © IPMA, reused under its open data terms with attribution.

## Troubleshooting

- **"Choose a location in the configuration"**: no location is selected — pick one, or use the
  house button.
- **"IPMA does not answer"**: not a single IPMA file could be read. Check that Gladys reaches the
  Internet, then press **Check IPMA now**. The integration keeps trying at every refresh and says
  in its logs when IPMA answers again.
- **The station values stay empty**: no IPMA station within 50 km sent a record in the last
  3 hours (frequent on small islands). The forecast still works.
- **A location of "Other locations" is ignored**: the name is unknown — check the spelling, or
  add the district: `Lagoa (Faro)`. The **Check IPMA now** button lists the unknown names.
- **More details**: set `LOG_LEVEL=debug` on the integration to see every refresh in its logs.

## Limits

- Portugal only (mainland, Madeira, Azores): IPMA covers nothing else.
- No fire risk on Madeira and the Azores: IPMA only forecasts it for the mainland.
- The forecast file used is the one of IPMA's website (`public-data`), like the Home Assistant
  integration; IPMA may change it without notice.
- IPMA writes its warning texts in Portuguese: the level and the phenomenon are translated, the
  free text is not.
- Not affiliated with IPMA. Developed without a real Gladys instance: feedback welcome.
