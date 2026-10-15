import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { FEATURES, buildDevice, buildStates } from '../src/device.js';
import {
  parseFireRisk,
  parseForecast,
  parseObservations,
  parseStations,
  parseWarnings,
} from '../src/ipma.js';
import { locationById } from '../src/locations.js';
import { buildSnapshot } from '../src/snapshot.js';
import { NOW, featureId, fixture } from './helpers/world.js';

const gladys = createFakeGladys();
const aveiro = locationById(1010500);
const snapshotAt = (now, location = aveiro) =>
  buildSnapshot({
    location,
    forecast: parseForecast(fixture('aggregate-1010500.json')),
    stations: parseStations(fixture('stations.json')),
    observations: parseObservations(fixture('observations.json')),
    warnings: parseWarnings(fixture('warnings_www.json')),
    fireRisk: parseFireRisk(fixture('rcm-d0.json')),
    now,
  });
const byKey = (states, locationId = 1010500) =>
  Object.fromEntries(
    states.map((state) => [
      state.device_feature_external_id.replace(featureId(locationId, ''), ''),
      state.state ?? state.text,
    ]),
  );

test('the external ids are built from the IPMA id of the location: they never change', () => {
  const device = buildDevice(gladys, aveiro, 'fr');
  assert.equal(device.external_id, 'ext:test-integration:location:1010500');
  assert.equal(device.name, 'IPMA Aveiro');
  assert.equal(device.should_poll, false);
  assert.deepEqual(
    device.features.map((feature) => feature.external_id),
    FEATURES.map((feature) => featureId(1010500, feature.key)),
  );
  assert.ok(device.features.every((feature) => feature.read_only && !feature.has_feedback));
});

test('the islands have no fire risk feature', () => {
  for (const id of [2310300, 3420300]) {
    const keys = buildDevice(gladys, locationById(id), 'en').features.map((f) => f.external_id);
    assert.ok(!keys.includes(featureId(id, 'fire_risk')));
    assert.equal(keys.length, FEATURES.length - 1);
  }
});

test('the names follow the configured language', () => {
  const names = (language) =>
    buildDevice(gladys, aveiro, language).features.find((f) => f.external_id.endsWith(':uv_index'))
      .name;
  assert.deepEqual(['en', 'fr', 'de', 'es'].map(names), [
    'UV index',
    'Indice UV',
    'UV-Index',
    'Índice UV',
  ]);
});

test('the states of Aveiro at 11:00, in French', () => {
  const states = byKey(buildStates(gladys, aveiro, snapshotAt(NOW), 'fr'));
  assert.deepEqual(states, {
    temperature: 23.7,
    humidity: 100,
    pressure: 1027.1,
    wind_speed: 4.7,
    precipitation: 0,
    today_min: 16.3,
    today_max: 22.6,
    today_rain_probability: 0,
    today_weather: 'Peu nuageux',
    today_wind: 'Modéré, NO',
    tomorrow_min: 16.6,
    tomorrow_max: 24.1,
    tomorrow_rain_probability: 0,
    tomorrow_weather: 'Peu nuageux',
    uv_index: 8,
    fire_risk: 2,
    warning_level: 1,
    warnings: 'Jaune : Fortes chaleurs',
  });
});

test('no warning on now: the next one is announced in the text', () => {
  const night = snapshotAt(new Date('2022-07-28T23:30:00Z'));
  const states = (language) => byKey(buildStates(gladys, aveiro, night, language));
  assert.equal(states('en').warning_level, 0);
  assert.equal(states('en').warnings, 'No warning now · next: Orange: Rough sea, Fri 06:00');
  // The weekday abbreviation comes from ICU (CLDR), which may change.
  assert.match(
    states('fr').warnings,
    /^Aucun en cours · à venir : Orange : Mer agitée, ven\S* 06:00$/,
  );
  assert.match(
    states('de').warnings,
    /^Derzeit keine · demnächst: Orange: Hoher Seegang, Fr\S* 06:00$/,
  );
  assert.match(
    states('es').warnings,
    /^Ninguno ahora · próximo: Naranja: Mar agitado, vie\S* 06:00$/,
  );
});

test('no warning at all, and unknown warnings', () => {
  const calm = { ...snapshotAt(NOW), warnings: [], warningLevel: 0 };
  assert.equal(byKey(buildStates(gladys, aveiro, calm, 'de')).warnings, 'Keine Warnung');
  const unknown = { ...snapshotAt(NOW), warnings: null, warningLevel: null };
  const states = byKey(buildStates(gladys, aveiro, unknown, 'de'));
  assert.equal(states.warnings, undefined);
  assert.equal(states.warning_level, undefined);
});

test('a value IPMA did not give is not published (Gladys keeps the last one)', () => {
  const snapshot = snapshotAt(NOW);
  snapshot.observation = { ...snapshot.observation, pressure: null, precipitation: null };
  snapshot.todayForecast = { ...snapshot.todayForecast, rainProbability: null, weatherType: null };
  const states = byKey(buildStates(gladys, aveiro, snapshot, 'en'));
  for (const key of ['pressure', 'precipitation', 'today_rain_probability', 'today_weather']) {
    assert.equal(states[key], undefined, key);
  }
  assert.equal(states.temperature, 23.7);
});
