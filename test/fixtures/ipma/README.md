# IPMA fixtures

Responses of the IPMA API (api.ipma.pt) used by the tests, kept byte for byte
(they are excluded from Prettier). Data © IPMA, Instituto Português do Mar e da
Atmosfera, open data.

| File                       | Endpoint                                                       | Origin                                                                                                                      |
| -------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `aggregate-1010500.json`   | `public-data/forecast/aggregate/1010500.json` (Aveiro)         | real response of 2022-07-28, from the `fixtures/` of [pyipma](https://github.com/dgomes/pyipma) (MIT, © Diogo Gomes)        |
| `locations.json`           | `public-data/forecast/locations.json`                          | real response, from pyipma                                                                                                  |
| `observations.json`        | `open-data/observation/meteorology/stations/observations.json` | real response of 2022-07-28 from pyipma, **trimmed** to the 7 stations of `stations.json`                                   |
| `rcm-d0.json`              | `open-data/forecast/meteorology/rcm/rcm-d0.json`               | real response of 2022-09-03, from pyipma                                                                                    |
| `weather-type-classe.json` | `open-data/weather-type-classe.json`                           | real response, from pyipma: every weather type must be translated                                                           |
| `warnings_www.json`        | `open-data/forecast/warnings/warnings_www.json`                | **assembled**: the format and texts of pyipma's and Home Assistant's tests (Apache-2.0), dated 2022-07-28 to match the rest |
| `stations.json`            | `open-data/observation/meteorology/stations/stations.json`     | **assembled**: the GeoJSON shape pyipma parses, real station ids, names and coordinates approximated for the tests          |

No real response of `warnings_www.json` and `stations.json` was available to
this repository (the API was out of reach of the development session):
`scripts/probe.mjs` reads the real ones.
