// -----------------------------------------------------------------------------
// Test world: the integration (src/app.js) running on the SDK's fake Gladys
// (`@gladysassistant/integration-sdk/testing`) and on a fake IPMA that serves
// the fixtures of test/fixtures/ipma through the REAL client — URLs, headers,
// parsers and error paths included. Nothing reaches the network.
// -----------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../../src/app.js';
import { ENDPOINTS, createIpmaClient } from '../../src/ipma.js';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/ipma/${name}`, import.meta.url), 'utf8'));

/** The fixtures, by URL. Tests change or remove entries to simulate IPMA. */
export function ipmaRoutes() {
  return new Map([
    [ENDPOINTS.forecast(1010500), fixture('aggregate-1010500.json')],
    [ENDPOINTS.stations, fixture('stations.json')],
    [ENDPOINTS.observations, fixture('observations.json')],
    [ENDPOINTS.warnings, fixture('warnings_www.json')],
    [ENDPOINTS.fireRisk, fixture('rcm-d0.json')],
  ]);
}

export { fixture };

/**
 * A fetch serving `routes` (URL → JSON body, a number for an HTTP error,
 * an Error to throw). Unknown URLs are 404. Every call is recorded.
 */
export function createFakeFetch(routes = ipmaRoutes()) {
  const calls = [];
  const fakeFetch = async (url, init = {}) => {
    calls.push({ url, headers: init.headers });
    const body = routes.get(url);
    if (body instanceof Error) {
      throw body;
    }
    const status = typeof body === 'number' ? body : body === undefined ? 404 : 200;
    return new Response(status === 200 ? JSON.stringify(body) : 'error', {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch: fakeFetch, calls, routes };
}

/** A logger that records every line: `lines` is [{ level, message }]. */
export function createRecordingLogger() {
  const lines = [];
  const logger = {
    lines,
    child: () => logger,
    at: (level) => lines.filter((line) => line.level === level).map((line) => line.message),
  };
  for (const level of ['debug', 'info', 'warn', 'error']) {
    logger[level] = (...args) =>
      lines.push({ level, message: args.map((arg) => String(arg?.message ?? arg)).join(' ') });
  }
  return logger;
}

// 2022-07-28, 11:00 in Lisbon (UTC+1): the day of the forecast and
// observation fixtures.
export const NOW = new Date('2022-07-28T10:00:00Z');

/**
 * @param {object} [options]
 * @param {object} [options.config] the raw configuration in Gladys
 * @param {boolean} [options.created] add the devices of the configured locations to Gladys
 * @param {Array} [options.houses]
 * @param {string|null} [options.dataDir]
 * @param {() => Date} [options.now]
 * @param {boolean} [options.timers]
 * @param {Map} [options.routes]
 */
export async function createWorld({
  config = { location: '1010500' },
  created = true,
  houses = [],
  dataDir = null,
  now = () => NOW,
  timers = false,
  routes,
} = {}) {
  const ipma = createFakeFetch(routes);
  const logger = createRecordingLogger();
  const gladys = createFakeGladys({ config: { ...config }, houses });
  const app = createApp({
    gladys,
    client: createIpmaClient({ fetch: ipma.fetch }),
    logger,
    dataDir,
    now,
    timers,
  });
  await gladys.connect();
  if (created) {
    for (const device of gladys.fake.discoveredDevices) {
      await gladys.fake.deviceCreated(device);
    }
  }
  return { gladys, fake: gladys.fake, app, ipma, logger };
}

/** The feature external id of a location, as published. */
export const featureId = (locationId, key) => `ext:test-integration:location:${locationId}:${key}`;
