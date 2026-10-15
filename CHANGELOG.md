# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.1] - 2026-10-15

### Added

- The official weather of Portugal (mainland, Madeira, Azores) from IPMA, its
  open data, without account or key: one device per location, chosen among the
  423 IPMA locations, or the one nearest to a house of Gladys.
- On each device: temperature, humidity, pressure, wind and rain of the closest
  weather station; minimum, maximum, chance of rain and weather for today and
  tomorrow; today's wind and UV index; today's fire risk (mainland); the
  warning level (green to red) and the warnings in words.
- The scene trigger "IPMA weather warning issued", filtered by location, level
  and phenomenon, with the period and IPMA's text as variables.
- The "IPMA forecast" dashboard widget: five days with weather icons, live
  temperature, UV, fire risk and the warnings.
- The "Check IPMA now" button, and texts in English, French, German and
  Spanish.

[Unreleased]: https://github.com/guim31/gladys-ipma/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/guim31/gladys-ipma/releases/tag/v1.0.1
