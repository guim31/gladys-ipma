// -----------------------------------------------------------------------------
// The IPMA client and its parsers, on real responses (test/fixtures/ipma).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENDPOINTS,
  IpmaError,
  createIpmaClient,
  ipmaNumber,
  parseFireRisk,
  parseForecast,
  parseObservations,
  parseStations,
  parseWarnings,
} from '../src/ipma.js';
import { WEATHER_TYPES } from '../src/codes.js';
import { createFakeFetch, fixture } from './helpers/world.js';

test('IPMA’s -99 means "no value"', () => {
  assert.equal(ipmaNumber('-99.0'), null);
  assert.equal(ipmaNumber(-99), null);
  assert.equal(ipmaNumber(''), null);
  assert.equal(ipmaNumber(null), null);
  assert.equal(ipmaNumber('abc'), null);
  assert.equal(ipmaNumber('16.3'), 16.3);
  assert.equal(ipmaNumber(0), 0);
  assert.equal(ipmaNumber('-4.5'), -4.5);
});

test('the aggregate forecast gives the daily entries, sorted', () => {
  const { updatedAt, days } = parseForecast(fixture('aggregate-1010500.json'));
  assert.equal(updatedAt, '2022-07-28T21:26:47');
  assert.equal(days.length, 10);
  assert.deepEqual(days[0], {
    date: '2022-07-28',
    min: 16.3,
    max: 22.6,
    rainProbability: 0,
    weatherType: 2,
    windClass: 2,
    windDirection: 'NW',
    uv: 8.1,
  });
  // The UV index is only forecast for the first days.
  assert.equal(days[3].uv, null);
  assert.equal(days[9].rainProbability, 7);
});

test('a forecast without daily entries, or not a list, is an error', () => {
  assert.throws(() => parseForecast({ error: 'x' }), IpmaError);
  assert.throws(
    () => parseForecast([{ idPeriodo: 1, dataPrev: '2022-07-28T02:00:00' }]),
    IpmaError,
  );
});

test('every weather type IPMA defines is translated', () => {
  for (const type of fixture('weather-type-classe.json').data) {
    if (type.idWeatherType >= 0) {
      assert.ok(WEATHER_TYPES[type.idWeatherType], `type ${type.idWeatherType} missing`);
    }
  }
});

test('stations and observations', () => {
  const stations = parseStations(fixture('stations.json'));
  assert.deepEqual(stations[1], {
    id: 1210702,
    name: 'Aveiro (Universidade)',
    latitude: 40.6345,
    longitude: -8.659,
  });
  const observations = parseObservations(fixture('observations.json'));
  const aveiro = observations.get(1210702);
  assert.equal(aveiro.length, 24);
  assert.equal(aveiro[0].time.toISOString(), '2022-07-28T00:00:00.000Z');
  assert.equal(aveiro[0].temperature, 17.7);
  // precAcumulada -99: no rain gauge on that station.
  assert.equal(aveiro.at(-1).precipitation, null);
  // A null record (station silent that hour) is skipped.
  assert.equal(observations.get(1210907).at(-1).time.toISOString(), '2022-07-28T22:00:00.000Z');
  assert.throws(() => parseObservations([]), IpmaError);
});

test('warnings: green ones dropped, phenomena and levels decoded', () => {
  const warnings = parseWarnings(fixture('warnings_www.json'));
  assert.equal(warnings.length, 7);
  assert.ok(warnings.every((warning) => warning.level !== 'green'));
  const aveiro = warnings.filter((warning) => warning.area === 'AVR');
  assert.deepEqual(
    aveiro.map((warning) => [warning.phenomenon, warning.level, warning.levelValue]),
    [
      ['heat', 'yellow', 1],
      ['coastal', 'orange', 2],
      ['fog', 'yellow', 1],
    ],
  );
  const unknown = parseWarnings([
    {
      text: '',
      awarenessTypeName: 'Poeiras',
      idAreaAviso: 'FAR',
      startTime: '2022-07-28T00:00:00',
      endTime: '2022-07-28T10:00:00',
      awarenessLevelID: 'yellow',
    },
  ]);
  assert.equal(unknown[0].phenomenon, 'other');
});

test('fire risk by municipality', () => {
  const { date, byDico } = parseFireRisk(fixture('rcm-d0.json'));
  assert.equal(date, '2022-09-03');
  assert.equal(byDico.size, 278);
  assert.equal(byDico.get('0105'), 2);
  assert.throws(() => parseFireRisk({}), IpmaError);
});

test('the client reads the IPMA URLs with a user agent, no credentials', async () => {
  const ipma = createFakeFetch();
  const client = createIpmaClient({ fetch: ipma.fetch });
  const forecast = await client.forecast(1010500);
  assert.equal(forecast.days.length, 10);
  assert.equal(
    ipma.calls[0].url,
    'https://api.ipma.pt/public-data/forecast/aggregate/1010500.json',
  );
  assert.match(ipma.calls[0].headers['user-agent'], /gladys-ipma/);
  assert.equal(ipma.calls[0].headers.authorization, undefined);
  for (const url of Object.values(ENDPOINTS).filter((value) => typeof value === 'string')) {
    assert.match(url, /^https:\/\/api\.ipma\.pt\//);
  }
});

test('the client turns HTTP errors, timeouts and bad JSON into short IpmaErrors', async () => {
  const routes = new Map([
    [ENDPOINTS.warnings, 503],
    [ENDPOINTS.stations, Object.assign(new Error('aborted'), { name: 'TimeoutError' })],
    [ENDPOINTS.fireRisk, new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } })],
  ]);
  const client = createIpmaClient({ fetch: createFakeFetch(routes).fetch });
  await assert.rejects(client.warnings(), {
    name: 'IpmaError',
    status: 503,
    message: '/open-data/forecast/warnings/warnings_www.json: HTTP 503',
  });
  await assert.rejects(client.stations(), /stations\.json: timed out/);
  await assert.rejects(client.fireRisk(), /rcm-d0\.json: ENOTFOUND/);
  await assert.rejects(client.forecast(1010500), /HTTP 404/);

  const notJson = async () => new Response('<html>', { status: 200 });
  await assert.rejects(createIpmaClient({ fetch: notJson }).warnings(), /invalid JSON/);
});
