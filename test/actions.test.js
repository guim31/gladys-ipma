// -----------------------------------------------------------------------------
// The buttons of the Configuration screen.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from './helpers/world.js';

const HOUSES = [
  { id: 'h1', name: 'Casa da avó', selector: 'casa-da-avo', latitude: 41.5503, longitude: -8.4201 },
  { id: 'h2', name: 'Maison', selector: 'maison', latitude: 48.8566, longitude: 2.3522 },
  { id: 'h3', name: 'Chalet', selector: 'chalet', latitude: null, longitude: null },
];

async function action(world, key, fields) {
  const ack = await world.fake.action(key, fields);
  assert.equal(ack.success, true, ack.error);
  return ack.data.message;
}

test('the location nearest to a house is saved and followed at once', async () => {
  const world = await createWorld({ config: {}, houses: HOUSES, created: false });
  const message = await action(world, 'nearest_location', { house: 'casa-da-avo' });
  assert.equal(world.fake.config.location, '1030300');
  assert.match(message.fr, /^Lieu choisi : Braga \(Braga\), à \d+ km de « Casa da avó »/);
  assert.match(message.de, /Braga \(Braga\), \d+ km von „Casa da avó“ entfernt/);
  assert.equal(world.fake.discoveredDevices[0].name, 'IPMA Braga');
  world.app.stop();
});

test('a house outside Portugal, or without a position, changes nothing', async () => {
  const world = await createWorld({ houses: HOUSES, created: false });
  const far = await action(world, 'nearest_location', { house: 'maison' });
  assert.match(
    far.en,
    /^"Maison" is \d+ km from the nearest IPMA location: IPMA only covers Portugal/,
  );
  const unlocated = await action(world, 'nearest_location', { house: 'chalet' });
  assert.match(unlocated.es, /no tiene posición/);
  const gone = await action(world, 'nearest_location', { house: 'nope' });
  assert.match(gone.en, /no longer exists/);
  assert.equal(world.fake.config.location, '1010500');
  world.app.stop();
});

test('the coordinates of the houses never reach the logs', async () => {
  const world = await createWorld({ config: {}, houses: HOUSES, created: false });
  await action(world, 'nearest_location', { house: 'casa-da-avo' });
  await action(world, 'nearest_location', { house: 'maison' });
  const logs = world.logger.lines.map((line) => line.message).join('\n');
  for (const house of HOUSES.filter((candidate) => candidate.latitude !== null)) {
    assert.ok(!logs.includes(String(house.latitude)), 'latitude logged');
    assert.ok(!logs.includes(String(house.longitude)), 'longitude logged');
  }
  // One line per user action, at info level.
  assert.ok(world.logger.at('info').includes('Action nearest_location'));
  world.app.stop();
});

test('the check reads IPMA for every configured location, added or not', async () => {
  const world = await createWorld({
    config: { location: '1010500', extra_locations: 'Funchal, Nowhere' },
    created: false,
  });
  const message = await action(world, 'check');
  assert.equal(
    message.en,
    'Aveiro: 23.7 °C at Aveiro (Porto), 16.3 to 22.6 °C today, 2 warning(s). ' +
      'Funchal: 21.7 °C at Funchal, 0 warning(s). ' +
      'Unknown locations ignored: Nowhere. ' +
      'IPMA does not answer: /public-data/forecast/aggregate/2310300.json: HTTP 404',
  );
  assert.match(message.fr, /^Aveiro : 23\.7 °C à Aveiro \(Porto\), 16\.3 à 22\.6 °C aujourd’hui/);
  world.app.stop();
});

test('the check without a location says what to do', async () => {
  const world = await createWorld({ config: {} });
  assert.match((await action(world, 'check')).en, /Choose a location/);
  world.app.stop();
});
