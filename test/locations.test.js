import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCATIONS,
  findLocation,
  hasFireRisk,
  locationById,
  locationLabel,
  nearestLocation,
  parseLocationList,
} from '../src/locations.js';
import { fixture } from './helpers/world.js';

test('the static table is IPMA’s list of forecast locations', () => {
  const ipma = fixture('locations.json');
  assert.equal(LOCATIONS.length, ipma.length);
  for (const entry of ipma) {
    const location = locationById(entry.globalIdLocal);
    assert.ok(location, `${entry.local} is missing`);
    assert.equal(location.name, entry.local);
    assert.equal(location.area, entry.idAreaAviso);
    assert.equal(location.latitude, Number(entry.latitude));
  }
  assert.equal(new Set(LOCATIONS.map((location) => location.id)).size, LOCATIONS.length);
});

test('a location knows its region, time zone and fire risk code', () => {
  const aveiro = locationById(1010500);
  assert.deepEqual(
    [aveiro.region, aveiro.timeZone, aveiro.dico, aveiro.district, hasFireRisk(aveiro)],
    [1, 'Europe/Lisbon', '0105', 'Aveiro', true],
  );
  const funchal = locationById(2310300);
  assert.deepEqual([funchal.timeZone, hasFireRisk(funchal)], ['Atlantic/Madeira', false]);
  const horta = locationById(3470100);
  assert.deepEqual([horta.timeZone, horta.district], ['Atlantic/Azores', 'Faial']);
  assert.equal(locationLabel(horta), 'Horta (Faial, Açores)');
  assert.equal(locationLabel(locationById(1080600)), 'Lagoa (Faro)');
});

test('every mainland location has a fire risk in the RCM file', () => {
  const { local } = fixture('rcm-d0.json');
  for (const location of LOCATIONS.filter(hasFireRisk)) {
    assert.ok(local[location.dico], `${location.name}: no RCM entry ${location.dico}`);
  }
});

test('a location typed by hand is found by id, name or label, whatever the accents', () => {
  assert.equal(findLocation('1010500')?.name, 'Aveiro');
  assert.equal(findLocation('ilhavo')?.name, 'Ílhavo');
  assert.equal(findLocation('  ÉVORA ')?.name, 'Évora');
  assert.equal(findLocation('Lagoa (Faro)')?.id, 1080600);
  assert.equal(findLocation('Horta (Faial, Acores)')?.id, 3470100);
  assert.equal(findLocation('Paris'), undefined);
  assert.equal(findLocation(''), undefined);
  assert.equal(findLocation('99'), undefined);
});

test('a list of locations keeps the unknown names apart', () => {
  const { locations, unknown } = parseLocationList('Funchal; ponta delgada,\nParis, , Braga');
  assert.deepEqual(
    locations.map((location) => location.name),
    ['Funchal', 'Ponta Delgada', 'Braga'],
  );
  assert.deepEqual(unknown, ['Paris']);
  assert.deepEqual(parseLocationList(undefined), { locations: [], unknown: [] });
});

test('the nearest location of a point', () => {
  const { location, distance } = nearestLocation({ latitude: 40.64, longitude: -8.65 });
  assert.equal(location.name, 'Aveiro');
  assert.ok(distance < 1);
  const paris = nearestLocation({ latitude: 48.8566, longitude: 2.3522 });
  assert.ok(paris.distance > 900, `Paris is ${paris.distance} km away`);
});
