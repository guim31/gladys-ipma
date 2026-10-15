// -----------------------------------------------------------------------------
// Integration configuration: defaults (they mirror the `default` values of the
// manifest `config_schema`, see test/manifest.test.js) and normalization, so
// the rest of the code never deals with strings, blanks or `undefined`.
// -----------------------------------------------------------------------------

import { locationById, parseLocationList } from './locations.js';

export const LANGUAGES = ['en', 'fr', 'de', 'es'];

// Minutes between two reads of IPMA. Its forecasts change a few times a day
// and its observations once an hour: half an hour is plenty.
export const REFRESH_INTERVALS = ['15', '30', '60'];

// Each location costs one forecast file per refresh: a bound keeps the
// traffic sent to a free public service reasonable.
export const MAX_LOCATIONS = 10;

export const DEFAULT_CONFIG = {
  extra_locations: '',
  language: 'fr',
  refresh_interval: '30',
};

/**
 * @param {Record<string, unknown>} raw the configuration returned by the SDK
 * @returns {{ locations: import('./locations.js').Location[], unknownLocations: string[],
 *   droppedLocations: number, language: string, refreshMinutes: number }}
 */
export function normalizeConfig(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const locations = [];
  const add = (location) => {
    if (location && !locations.some((known) => known.id === location.id)) {
      locations.push(location);
    }
  };
  add(locationById(source.location));
  const extra = parseLocationList(source.extra_locations ?? DEFAULT_CONFIG.extra_locations);
  extra.locations.forEach(add);

  const refresh = REFRESH_INTERVALS.includes(String(source.refresh_interval))
    ? String(source.refresh_interval)
    : DEFAULT_CONFIG.refresh_interval;
  return {
    locations: locations.slice(0, MAX_LOCATIONS),
    unknownLocations: extra.unknown,
    droppedLocations: Math.max(0, locations.length - MAX_LOCATIONS),
    language: LANGUAGES.includes(source.language) ? source.language : DEFAULT_CONFIG.language,
    refreshMinutes: Number(refresh),
  };
}

export const refreshMs = (config) => config.refreshMinutes * 60 * 1000;
