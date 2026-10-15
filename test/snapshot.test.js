// -----------------------------------------------------------------------------
// What a location shows, from the real files of 2022-07-28.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFireRisk,
  parseForecast,
  parseObservations,
  parseStations,
  parseWarnings,
} from '../src/ipma.js';
import { locationById } from '../src/locations.js';
import { buildSnapshot, pickObservation } from '../src/snapshot.js';
import { NOW, fixture } from './helpers/world.js';

const files = () => ({
  forecast: parseForecast(fixture('aggregate-1010500.json')),
  stations: parseStations(fixture('stations.json')),
  observations: parseObservations(fixture('observations.json')),
  warnings: parseWarnings(fixture('warnings_www.json')),
  fireRisk: parseFireRisk(fixture('rcm-d0.json')),
});

const aveiro = locationById(1010500);

test('Aveiro on 2022-07-28 at 11:00', () => {
  const snapshot = buildSnapshot({ location: aveiro, ...files(), now: NOW });
  assert.equal(snapshot.today, '2022-07-28');
  assert.deepEqual(
    [snapshot.todayForecast.min, snapshot.todayForecast.max, snapshot.uv],
    [16.3, 22.6, 8.1],
  );
  assert.deepEqual([snapshot.tomorrowForecast.min, snapshot.tomorrowForecast.max], [16.6, 24.1]);
  assert.equal(snapshot.days.length, 5);
  assert.equal(snapshot.fireRisk, 2);

  // The closest station with a recent record.
  assert.equal(snapshot.observation.station.id, 1210907);
  assert.equal(snapshot.observation.time.toISOString(), '2022-07-28T10:00:00.000Z');

  // Heat (09:00-18:00 local) is on, rough sea is tomorrow, the fog is over.
  assert.deepEqual(
    snapshot.warnings.map((warning) => [warning.phenomenon, warning.active]),
    [
      ['heat', true],
      ['coastal', false],
    ],
  );
  assert.equal(snapshot.warningLevel, 1);
});

test('the forecast follows the local date: past days are dropped', () => {
  const snapshot = buildSnapshot({
    location: aveiro,
    ...files(),
    // 00:30 in Lisbon on the 29th.
    now: new Date('2022-07-28T23:30:00Z'),
  });
  assert.equal(snapshot.today, '2022-07-29');
  assert.equal(snapshot.todayForecast.max, 24.1);
  assert.equal(snapshot.days[0].date, '2022-07-29');
  // Nothing active any more, the rough sea starts at 06:00.
  assert.equal(snapshot.warningLevel, 0);
  assert.equal(snapshot.warnings.length, 1);
});

test('a silent station gives way to its last record, then to the next station', () => {
  const { stations, observations } = files();
  // 23:30 UTC: the closest station sent nothing at 23:00, its 22:00 record counts.
  const late = pickObservation(aveiro, stations, observations, new Date('2022-07-28T23:30:00Z'));
  assert.equal(late.station.id, 1210907);
  assert.equal(late.time.toISOString(), '2022-07-28T22:00:00.000Z');
  // Four hours later, too old: the next station with nothing recent either.
  assert.equal(
    pickObservation(aveiro, stations, observations, new Date('2022-07-29T03:30:00Z')),
    null,
  );
  // Without the closest station, the next one within 50 km.
  observations.delete(1210907);
  assert.equal(pickObservation(aveiro, stations, observations, NOW).station.id, 1210702);
});

test('the Azores: own time zone, no fire risk, no station close enough', () => {
  const pontaDelgada = locationById(3420300);
  const snapshot = buildSnapshot({
    location: pontaDelgada,
    ...files(),
    forecast: null,
    now: NOW,
  });
  // 10:00-15:00 in the Azores (UTC+0 in summer).
  assert.equal(snapshot.warningLevel, 3);
  assert.equal(snapshot.warnings[0].phenomenon, 'thunderstorm');
  assert.equal(snapshot.fireRisk, null);
  assert.equal(snapshot.observation, null);
  assert.equal(snapshot.todayForecast, null);
  assert.deepEqual(snapshot.days, []);
});

test('a file that could not be read leaves its part unknown', () => {
  const snapshot = buildSnapshot({
    location: aveiro,
    forecast: null,
    stations: null,
    observations: null,
    warnings: null,
    fireRisk: null,
    now: NOW,
  });
  assert.equal(snapshot.warnings, null);
  assert.equal(snapshot.warningLevel, null);
  assert.equal(snapshot.observation, null);
  assert.equal(snapshot.uv, null);
});
