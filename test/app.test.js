// -----------------------------------------------------------------------------
// The integration on the SDK's fake Gladys and a fake IPMA: what Gladys
// receives over time, without anyone calling onPoll.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ENDPOINTS } from '../src/ipma.js';
import { HEARTBEAT_MS } from '../src/refresher.js';
import { NOW, createWorld, featureId, fixture, ipmaRoutes } from './helpers/world.js';

const MINUTE = 60 * 1000;
const temperature = featureId(1010500, 'temperature');

/** Let the async work started by a timer settle. */
async function settle() {
  for (let i = 0; i < 50; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** Mocked clock starting at NOW; `advance(ms)` runs the timers due, then settles. */
function clock(t) {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: NOW.getTime() });
  return async (ms, step = 30 * MINUTE) => {
    for (let elapsed = 0; elapsed < ms; elapsed += step) {
      t.mock.timers.tick(Math.min(step, ms - elapsed));
      await settle();
    }
  };
}

/** The observations, with every temperature of the closest station changed. */
function observationsWith(value) {
  const observations = fixture('observations.json');
  for (const stations of Object.values(observations)) {
    if (stations['1210907']) {
      stations['1210907'].temperatura = value;
    }
  }
  return observations;
}

test('nothing is read from IPMA before a device is added to Gladys', async () => {
  const { fake, ipma, app } = await createWorld({ created: false });
  assert.equal(fake.discoveredDevices.length, 1);
  assert.equal(ipma.calls.length, 0);
  assert.equal(fake.states.length, 0);
  app.stop();
});

test('a device added to Gladys gets its states at once, and the widget is nudged', async () => {
  const { fake, ipma, app } = await createWorld();
  assert.equal(fake.lastState(temperature), 23.7);
  assert.equal(fake.lastState(featureId(1010500, 'warnings')), 'Jaune : Fortes chaleurs');
  assert.ok(fake.widgetRefreshes.includes('forecast'));
  assert.deepEqual(fake.connectionStatus, { connected: true });
  // Five files: stations, observations, warnings, fire risk, one forecast.
  assert.equal(ipma.calls.length, 5);

  // Added again (Gladys was reset): sent again, from the files just read.
  const before = fake.states.length;
  await fake.deviceCreated(fake.discoveredDevices[0]);
  assert.ok(fake.states.length >= before + 18);
  assert.equal(ipma.calls.length, 5);
  app.stop();
});

test('the states refresh on the container’s own timer, without onPoll', async (t) => {
  const advance = clock(t);
  const { fake, ipma, app } = await createWorld({ timers: true, now: () => new Date() });
  assert.equal(fake.discoveredDevices[0].should_poll, false);
  assert.equal(fake.lastState(temperature), 23.7);

  ipma.routes.set(ENDPOINTS.observations, observationsWith(25.4));
  await advance(30 * MINUTE);
  assert.equal(fake.lastState(temperature), 25.4);
  // Nobody called onPoll: no poll ack was ever sent.
  assert.equal(fake.wsMessages.filter((message) => /poll/.test(message.type)).length, 0);
  app.stop();
});

test('the refresh interval follows the configuration', async (t) => {
  const advance = clock(t);
  const { fake, ipma, app } = await createWorld({
    timers: true,
    now: () => new Date(),
    config: { location: '1010500', refresh_interval: '60' },
  });
  ipma.routes.set(ENDPOINTS.observations, observationsWith(26.1));
  await advance(30 * MINUTE);
  assert.equal(fake.lastState(temperature), 23.7);
  await advance(30 * MINUTE);
  assert.equal(fake.lastState(temperature), 26.1);
  app.stop();
});

test('only the changes are published, and a stable value is re-sent every 6 hours', async (t) => {
  const advance = clock(t);
  const { fake, app } = await createWorld({ timers: true, now: () => new Date() });
  const fireRisk = featureId(1010500, 'fire_risk');
  const count = () =>
    fake.states.filter((state) => state.device_feature_external_id === fireRisk).length;
  assert.equal(count(), 1);
  await advance(HEARTBEAT_MS - 30 * MINUTE);
  assert.equal(count(), 1, 'unchanged: not sent again');
  await advance(30 * MINUTE);
  assert.equal(count(), 2, 'heartbeat');
  app.stop();
});

test('the core’s onPoll is a fallback: it does nothing while the timer runs', async () => {
  const { fake, ipma, app } = await createWorld();
  const reads = ipma.calls.length;
  assert.deepEqual(await fake.poll(fake.discoveredDevices[0]), { success: true });
  assert.equal(ipma.calls.length, reads);
  app.stop();
});

test('the core’s onPoll refreshes when the timer is late', async () => {
  let now = NOW;
  const { fake, ipma, app } = await createWorld({ now: () => now });
  ipma.routes.set(ENDPOINTS.observations, observationsWith(24.2));
  now = new Date(NOW.getTime() + 40 * MINUTE);
  await fake.poll(fake.discoveredDevices[0]);
  assert.equal(fake.lastState(temperature), 24.2);
  app.stop();
});

test('a new IPMA warning fires the scene trigger once, even across restarts', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'ipma-'));
  t.after(() => rm(dataDir, { recursive: true, force: true }));

  const first = await createWorld({ dataDir });
  assert.deepEqual(
    first.fake.sceneEvents.map(({ key, data }) => [key, data.phenomenon, data.level, data.active]),
    [
      ['warning_issued', 'heat', 'yellow', true],
      ['warning_issued', 'coastal', 'orange', false],
    ],
  );
  assert.deepEqual(first.fake.sceneEvents[0].data, {
    device: 'ext:test-integration:location:1010500',
    location: 'Aveiro',
    level: 'yellow',
    level_label: 'Jaune',
    phenomenon: 'heat',
    phenomenon_label: 'Fortes chaleurs',
    starts_at: '2022-07-28T08:00:00.000Z',
    ends_at: '2022-07-28T17:00:00.000Z',
    active: true,
    description: 'Persistência de valores elevados da temperatura máxima.',
  });
  const saved = JSON.parse(await readFile(join(dataDir, 'announced-warnings.json'), 'utf8'));
  assert.equal(Object.keys(saved.announced).length, 2);
  first.app.stop();

  // A restart: the same warnings are not announced again.
  const second = await createWorld({ dataDir });
  assert.equal(second.fake.sceneEvents.length, 0);

  // IPMA raises the heat warning to orange: a new warning.
  const warnings = fixture('warnings_www.json');
  warnings[1].awarenessLevelID = 'orange';
  const third = await createWorld({
    dataDir,
    routes: new Map([...ipmaRoutes(), [ENDPOINTS.warnings, warnings]]),
  });
  assert.deepEqual(
    third.fake.sceneEvents.map(({ data }) => [data.phenomenon, data.level]),
    [['heat', 'orange']],
  );
  second.app.stop();
  third.app.stop();
});

test('a scene event Gladys refuses is announced again at the next refresh', async (t) => {
  let refuse = true;
  const { gladys, fake, app } = await createWorld({ created: false });
  const original = gladys.publishSceneEvent.bind(gladys);
  t.mock.method(gladys, 'publishSceneEvent', async (...args) => {
    if (refuse) {
      throw new Error('HTTP 429');
    }
    return original(...args);
  });
  await fake.deviceCreated(fake.discoveredDevices[0]);
  assert.equal(fake.sceneEvents.length, 0);
  refuse = false;
  await app.refresher.restart();
  assert.equal(fake.sceneEvents.length, 2);
  app.stop();
});

test('IPMA down: one warning per file, an honest status, one line on recovery', async (t) => {
  const advance = clock(t);
  const { fake, ipma, logger, app } = await createWorld({
    timers: true,
    now: () => new Date(),
    routes: new Map(),
  });
  assert.equal(fake.connectionStatus.connected, false);
  assert.match(fake.connectionStatus.message.en, /^IPMA does not answer \(.*HTTP 404\)\.$/);
  const warnings = logger.at('warn').length;
  assert.equal(warnings, 5);
  assert.equal(fake.states.length, 0);

  // Still down: nothing more at warn level.
  await advance(30 * MINUTE);
  assert.equal(logger.at('warn').length, warnings);

  // Back: one info line per file, the states, the status.
  for (const [url, body] of ipmaRoutes()) {
    ipma.routes.set(url, body);
  }
  await advance(30 * MINUTE);
  assert.equal(logger.at('info').filter((line) => /available again/.test(line)).length, 5);
  assert.deepEqual(fake.connectionStatus, { connected: true });
  assert.ok(fake.lastState(temperature));
  app.stop();
});

test('a missing forecast is a partial outage, not "IPMA unreachable"', async () => {
  const routes = ipmaRoutes();
  routes.delete(ENDPOINTS.forecast(1010500));
  const { fake, logger, app } = await createWorld({ routes });
  assert.deepEqual(fake.connectionStatus, { connected: true });
  assert.equal(fake.lastState(featureId(1010500, 'today_max')), undefined);
  assert.equal(fake.lastState(temperature), 23.7);
  assert.equal(logger.at('warn').length, 1);
  app.stop();
});

test('a normal refresh writes nothing at info level', async (t) => {
  const advance = clock(t);
  const { logger, ipma, app } = await createWorld({ timers: true, now: () => new Date() });
  const lines = logger.lines.length;
  ipma.routes.set(ENDPOINTS.observations, observationsWith(25.4));
  await advance(2 * 30 * MINUTE);
  const after = logger.lines.slice(lines);
  assert.ok(after.length > 0, 'the cycles log at debug level');
  assert.deepEqual(
    after.filter((line) => line.level !== 'debug'),
    [],
  );
  app.stop();
});

test('the startup logs say what runs, once', async () => {
  const { logger, app } = await createWorld({
    config: { location: '1010500', extra_locations: 'Funchal, Atlantis' },
  });
  assert.deepEqual(logger.at('info'), [
    'Locations: Aveiro, Funchal; refresh every 30 min; language fr',
  ]);
  assert.deepEqual(logger.at('warn'), [
    'Unknown locations ignored: Atlantis',
    'IPMA forecast of Funchal: /public-data/forecast/aggregate/2310300.json: HTTP 404',
  ]);
  app.stop();
});

test('without a location: no device, a status that says what to do', async () => {
  const { fake, ipma, app } = await createWorld({ config: {} });
  assert.deepEqual(fake.discoveredDevices, []);
  assert.equal(fake.connectionStatus.connected, false);
  assert.match(fake.connectionStatus.message.fr, /Choisissez un lieu/);
  assert.equal(ipma.calls.length, 0);

  // The user picks a location: devices published, status cleared once read.
  await fake.configUpdated({ location: '1131200' });
  assert.equal(fake.discoveredDevices[0].name, 'IPMA Porto');
  await fake.deviceCreated(fake.discoveredDevices[0]);
  assert.deepEqual(fake.connectionStatus, { connected: true });
  app.stop();
});

test('at most 10 locations', async () => {
  const extra = 'Braga, Porto, Coimbra, Leiria, Faro, Beja, Évora, Guarda, Viseu, Lisboa';
  const { fake, logger, app } = await createWorld({
    config: { location: '1010500', extra_locations: extra },
    created: false,
  });
  assert.equal(fake.discoveredDevices.length, 10);
  assert.ok(logger.at('warn').includes('1 location(s) beyond the first 10 ignored'));
  app.stop();
});
