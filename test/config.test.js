import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, normalizeConfig, refreshMs } from '../src/config.js';

const names = (config) => config.locations.map((location) => location.name);

test('defaults: no location, French, every 30 minutes', () => {
  const config = normalizeConfig();
  assert.deepEqual(config.locations, []);
  assert.equal(config.language, 'fr');
  assert.equal(config.refreshMinutes, 30);
  assert.equal(refreshMs(config), 30 * 60 * 1000);
  assert.equal(DEFAULT_CONFIG.language, 'fr');
});

test('the main location first, then the other ones, without duplicates', () => {
  const config = normalizeConfig({
    location: '1010500',
    extra_locations: 'Funchal, aveiro, 1131200, Atlantis',
    language: 'es',
    refresh_interval: '15',
  });
  assert.deepEqual(names(config), ['Aveiro', 'Funchal', 'Porto']);
  assert.deepEqual(config.unknownLocations, ['Atlantis']);
  assert.equal(config.language, 'es');
  assert.equal(config.refreshMinutes, 15);
});

test('unexpected values fall back to the defaults', () => {
  const config = normalizeConfig({ location: 'x', language: 'pt', refresh_interval: 5 });
  assert.deepEqual(config.locations, []);
  assert.equal(config.language, 'fr');
  assert.equal(config.refreshMinutes, 30);
  assert.deepEqual(normalizeConfig(null).locations, []);
});
