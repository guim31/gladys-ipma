// -----------------------------------------------------------------------------
// What one location shows at an instant, from the IPMA files.
//
// Pure functions: the refresher feeds them the parsed files, the device, the
// widget and the scene trigger read the result. A part whose file could not
// be read is null (or an empty list): the features it feeds are then simply
// not published, Gladys keeps their last value.
// -----------------------------------------------------------------------------

import { distanceKm, hasFireRisk } from './locations.js';
import { localDate, localToDate, nextDate } from './time.js';

// A station further away describes another place (the islands are far apart).
export const MAX_STATION_DISTANCE_KM = 50;
// An observation older than this is not "current" any more.
export const MAX_OBSERVATION_AGE_MS = 3 * 60 * 60 * 1000;
// Days shown by the widget.
export const FORECAST_DAYS = 5;

/**
 * The most recent valid observation of the closest station that has one.
 * @returns {null | { station: { id: number, name: string, distance: number },
 *   time: Date, temperature: number|null, humidity: number|null,
 *   pressure: number|null, windSpeed: number|null, precipitation: number|null }}
 */
export function pickObservation(location, stations, observations, now) {
  if (!stations || !observations) {
    return null;
  }
  const near = stations
    .map((station) => ({ station, distance: distanceKm(location, station) }))
    .filter(({ distance }) => distance <= MAX_STATION_DISTANCE_KM)
    .sort((a, b) => a.distance - b.distance);
  for (const { station, distance } of near) {
    const records = observations.get(station.id) ?? [];
    for (let index = records.length - 1; index >= 0; index -= 1) {
      const record = records[index];
      if (now - record.time > MAX_OBSERVATION_AGE_MS) {
        break;
      }
      if (record.temperature !== null && record.time <= now) {
        return {
          station: { id: station.id, name: station.name, distance: Math.round(distance * 10) / 10 },
          ...record,
        };
      }
    }
  }
  return null;
}

/**
 * The warnings of the location's area that are not over yet, the active
 * ones first, the highest level first.
 */
export function locationWarnings(location, warnings, now) {
  if (!warnings) {
    return [];
  }
  return warnings
    .filter((warning) => warning.area === location.area)
    .map((warning) => {
      const startsAt = localToDate(warning.start, location.timeZone);
      const endsAt = localToDate(warning.end, location.timeZone);
      return { ...warning, startsAt, endsAt, active: startsAt !== null && startsAt <= now };
    })
    .filter((warning) => warning.endsAt !== null && warning.endsAt > now)
    .sort(
      (a, b) =>
        Number(b.active) - Number(a.active) ||
        a.startsAt - b.startsAt ||
        b.levelValue - a.levelValue,
    );
}

/**
 * @param {object} input
 * @param {import('./locations.js').Location} input.location
 * @param {ReturnType<import('./ipma.js').parseForecast>|null} input.forecast
 * @param {Array|null} input.stations
 * @param {Map|null} input.observations
 * @param {Array|null} input.warnings parsed warnings of every area, null if unknown
 * @param {{ byDico: Map<string, number> }|null} input.fireRisk
 * @param {Date} input.now
 */
export function buildSnapshot({
  location,
  forecast,
  stations,
  observations,
  warnings,
  fireRisk,
  now,
}) {
  const today = localDate(now, location.timeZone);
  const tomorrow = nextDate(today);
  const days = forecast ? forecast.days.filter((day) => day.date >= today) : [];
  const todayForecast = days.find((day) => day.date === today) ?? null;
  const tomorrowForecast = days.find((day) => day.date === tomorrow) ?? null;

  const areaWarnings = warnings === null ? null : locationWarnings(location, warnings, now);
  const active = (areaWarnings ?? []).filter((warning) => warning.active);

  let fire = null;
  if (fireRisk && hasFireRisk(location)) {
    fire = fireRisk.byDico.get(location.dico) ?? null;
  }

  return {
    locationId: location.id,
    builtAt: now,
    today,
    forecastUpdatedAt: forecast?.updatedAt ?? null,
    days: days.slice(0, FORECAST_DAYS),
    todayForecast,
    tomorrowForecast,
    observation: pickObservation(location, stations, observations, now),
    // null: the warnings file could not be read (unknown, not "none").
    warnings: areaWarnings,
    warningLevel:
      areaWarnings === null ? null : Math.max(0, ...active.map((warning) => warning.levelValue)),
    uv: todayForecast?.uv ?? null,
    fireRisk: fire,
  };
}
