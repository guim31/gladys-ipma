// -----------------------------------------------------------------------------
// One Gladys device per IPMA location.
//
// Every feature is a read-only sensor. The external ids are built from the
// IPMA id of the location (globalIdLocal) and a feature key: both are
// forever, a renamed key is a new feature for Gladys.
//
// Category/type choices, checked against the core (test/gladys-rules.test.js):
// - the warning level is a `risk` feature: Gladys draws 0 to 3 as a green,
//   yellow, orange and red badge, IPMA's own colour scale;
// - the chances of rain and the fire risk (1 to 5) are `counter-sensor`
//   integers: Gladys has no "probability" type, and the `risk` badge only
//   knows 0 to 3;
// - several features share each type (decimal, integer, text, min, max), so
//   the dashboard shows their own names, not the generic name of the type.
//
// The devices are published with `should_poll: false`: the container
// refreshes them itself (src/refresher.js), the core's polling being
// unreliable for external devices (GladysAssistant/Gladys#3198).
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
  DEVICE_FEATURE_UNITS as U,
} from '@gladysassistant/integration-sdk';
import { FIRE_RISKS, LEVELS, PHENOMENA, weatherType, windText } from './codes.js';
import { NAMES, text } from './i18n.js';
import { hasFireRisk } from './locations.js';
import { weekdayTime } from './time.js';

export const DEVICE_TYPE = 'location';

/** The device external ids of a location. */
export const locationIds = (gladys, location) => gladys.externalIds(DEVICE_TYPE, location.id);

const sensor = (key, category, type, extra) => ({ key, category, type, ...extra });
const TEMPERATURE = { unit: U.CELSIUS, min: -50, max: 60 };
const PERCENT = { unit: U.PERCENT, min: 0, max: 100 };
// `min`/`max` are NOT NULL in Gladys, text features included (0/0).
const TEXT = { min: 0, max: 0, keep_history: false };

/** The features, in display order. `fire_risk` exists on the mainland only. */
export const FEATURES = [
  sensor('temperature', C.TEMPERATURE_SENSOR, T.SENSOR.DECIMAL, TEMPERATURE),
  sensor('humidity', C.HUMIDITY_SENSOR, T.SENSOR.DECIMAL, PERCENT),
  sensor('pressure', C.PRESSURE_SENSOR, T.SENSOR.DECIMAL, {
    unit: U.HECTO_PASCAL,
    min: 850,
    max: 1100,
  }),
  sensor('wind_speed', C.SPEED_SENSOR, T.SENSOR.DECIMAL, {
    unit: U.KILOMETER_PER_HOUR,
    min: 0,
    max: 300,
  }),
  sensor('precipitation', C.PRECIPITATION_SENSOR, T.SENSOR.DECIMAL, {
    unit: U.MILLIMETER_PER_HOUR,
    min: 0,
    max: 200,
  }),
  sensor('today_min', C.TEMPERATURE_SENSOR, T.TEMPERATURE_SENSOR.MIN, TEMPERATURE),
  sensor('today_max', C.TEMPERATURE_SENSOR, T.TEMPERATURE_SENSOR.MAX, TEMPERATURE),
  sensor('tomorrow_min', C.TEMPERATURE_SENSOR, T.TEMPERATURE_SENSOR.MIN, TEMPERATURE),
  sensor('tomorrow_max', C.TEMPERATURE_SENSOR, T.TEMPERATURE_SENSOR.MAX, TEMPERATURE),
  sensor('today_rain_probability', C.COUNTER_SENSOR, T.SENSOR.INTEGER, PERCENT),
  sensor('tomorrow_rain_probability', C.COUNTER_SENSOR, T.SENSOR.INTEGER, PERCENT),
  sensor('today_weather', C.TEXT, T.TEXT.TEXT, TEXT),
  sensor('tomorrow_weather', C.TEXT, T.TEXT.TEXT, TEXT),
  sensor('today_wind', C.TEXT, T.TEXT.TEXT, TEXT),
  sensor('uv_index', C.UV_SENSOR, T.SENSOR.INTEGER, { unit: U.UV_INDEX, min: 0, max: 20 }),
  sensor('fire_risk', C.COUNTER_SENSOR, T.SENSOR.INTEGER, { min: 1, max: 5 }),
  sensor('warning_level', C.RISK, T.RISK.INTEGER, { min: 0, max: 3 }),
  sensor('warnings', C.TEXT, T.TEXT.TEXT, TEXT),
];

const featuresOf = (location) =>
  FEATURES.filter((feature) => feature.key !== 'fire_risk' || hasFireRisk(location));

/**
 * The discovery payload of a location.
 * @param {object} gladys GladysIntegration
 * @param {import('./locations.js').Location} location
 * @param {string} language language of the feature names
 */
export function buildDevice(gladys, location, language) {
  const ids = locationIds(gladys, location);
  const names = NAMES[language] ?? NAMES.fr;
  return {
    name: `IPMA ${location.name}`,
    external_id: ids.device,
    should_poll: false,
    features: featuresOf(location).map(({ key, ...feature }) => ({
      name: names[key],
      external_id: ids.feature(key),
      read_only: true,
      has_feedback: false,
      keep_history: true,
      ...feature,
    })),
  };
}

const round1 = (value) => Math.round(value * 10) / 10;

/**
 * "Orange: Rough sea · Yellow: Wind" for the active warnings, or the next
 * one: "No warning now · next: Orange: Rough sea, Fri 07:00".
 */
function warningsText(snapshot, location, language) {
  const colon = language === 'fr' ? ' : ' : ': ';
  const describe = (warning) =>
    `${LEVELS[warning.level][language]}${colon}${PHENOMENA[warning.phenomenon][language]}`;
  const active = snapshot.warnings.filter((warning) => warning.active);
  if (active.length > 0) {
    return active.map(describe).join(' · ');
  }
  const next = snapshot.warnings[0];
  if (!next) {
    return text('noWarning', language);
  }
  const when = weekdayTime(next.startsAt, location.timeZone, language);
  return `${text('noWarningNow', language)} · ${text('next', language)}${colon}${describe(next)}, ${when}`;
}

/**
 * The states of a location's features, from a snapshot. A value IPMA did not
 * give is left out: Gladys keeps the last one.
 * @returns {Array<{ device_feature_external_id: string, state?: number, text?: string }>}
 */
export function buildStates(gladys, location, snapshot, language) {
  const ids = locationIds(gladys, location);
  const states = [];
  const number = (key, value) => {
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      states.push({ device_feature_external_id: ids.feature(key), state: value });
    }
  };
  const words = (key, value) => {
    // Gladys ignores an empty text state.
    if (typeof value === 'string' && value.trim() !== '') {
      states.push({ device_feature_external_id: ids.feature(key), text: value });
    }
  };

  const observation = snapshot.observation;
  if (observation) {
    number('temperature', observation.temperature);
    number('humidity', observation.humidity);
    number('pressure', observation.pressure);
    number('wind_speed', observation.windSpeed);
    number('precipitation', observation.precipitation);
  }

  const today = snapshot.todayForecast;
  const tomorrow = snapshot.tomorrowForecast;
  if (today) {
    number('today_min', today.min);
    number('today_max', today.max);
    number(
      'today_rain_probability',
      today.rainProbability === null ? null : Math.round(today.rainProbability),
    );
    if (today.weatherType !== null) {
      words('today_weather', weatherType(today.weatherType)[language]);
    }
    words('today_wind', windText(today.windClass, today.windDirection, language));
  }
  if (tomorrow) {
    number('tomorrow_min', tomorrow.min);
    number('tomorrow_max', tomorrow.max);
    number(
      'tomorrow_rain_probability',
      tomorrow.rainProbability === null ? null : Math.round(tomorrow.rainProbability),
    );
    if (tomorrow.weatherType !== null) {
      words('tomorrow_weather', weatherType(tomorrow.weatherType)[language]);
    }
  }

  number('uv_index', snapshot.uv === null ? null : Math.round(snapshot.uv));
  if (hasFireRisk(location)) {
    number('fire_risk', snapshot.fireRisk);
  }
  if (snapshot.warnings !== null) {
    number('warning_level', snapshot.warningLevel);
    words('warnings', warningsText(snapshot, location, language));
  }
  return states.map((state) =>
    typeof state.state === 'number' && !Number.isInteger(state.state)
      ? { ...state, state: round1(state.state) }
      : state,
  );
}

/** Label of a fire risk class, for the widget. */
export const fireRiskLabel = (value, language) => FIRE_RISKS[value]?.[language] ?? null;
