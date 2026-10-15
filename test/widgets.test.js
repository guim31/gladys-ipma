// -----------------------------------------------------------------------------
// The `forecast` widget: rendered exactly as sent (the SDK's validator mirrors
// the core's vocabulary and budget), in every language, and its live tile
// points at a feature that exists.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WEATHER_TYPES } from '../src/codes.js';
import { TEXT } from '../src/i18n.js';
import { notConfiguredContent } from '../src/widgets.js';
import { NOW, createWorld, featureId, fixture, ipmaRoutes } from './helpers/world.js';
import { ENDPOINTS } from '../src/ipma.js';

const LANGS = ['en', 'fr', 'de', 'es'];

async function content(world, settings = {}, language = 'en') {
  const ack = await world.fake.widgetGet('forecast', { settings, language });
  assert.equal(ack.success, true, ack.error);
  return ack.data.content;
}

test('the widget fits the core’s budget, in every language', async () => {
  const world = await createWorld({ config: { location: '1010500', extra_locations: 'Horta' } });
  for (const language of LANGS) {
    for (const device of world.fake.discoveredDevices) {
      const widget = await content(world, { device: device.external_id }, language);
      assert.deepEqual(validateWidgetContent(widget), [], `${device.name} in ${language}`);
    }
  }
  world.app.stop();
});

test('Aveiro: live temperature, UV, fire risk, warnings and five days', async () => {
  const world = await createWorld();
  const widget = await content(world, {}, 'fr');
  const byType = (type) => widget.components.filter((component) => component.type === type);
  assert.deepEqual(
    byType('text').map((component) => component.text),
    ['IPMA · Aveiro', 'Station Aveiro (Porto) · 11:00'],
  );
  const tiles = byType('value');
  assert.deepEqual(
    tiles.map((tile) => [tile.label, tile.value ?? tile.device_feature]),
    [
      ['Maintenant', featureId(1010500, 'temperature')],
      ['Indice UV', 8],
      ['Risque d’incendie', 'Modéré'],
      ['Avertissements', 'Jaune'],
    ],
  );
  // The live tile points at a feature of the device Gladys knows.
  const features = world.fake.discoveredDevices[0].features.map((feature) => feature.external_id);
  assert.ok(features.includes(tiles[0].device_feature));

  const [warnings] = byType('card-list');
  assert.deepEqual(
    warnings.items.map((item) => [item.title, item.badge.text]),
    [
      ['Jaune · Fortes chaleurs', 'En cours'],
      ['Orange · Mer agitée', 'À venir'],
    ],
  );
  assert.match(warnings.items[0].description, /^Persistência de valores elevados/);

  const [days] = byType('status');
  assert.equal(days.items.length, 5);
  assert.deepEqual(days.items[0], {
    label: 'Aujourd’hui · Peu nuageux',
    value: '16° / 23° · 0 %',
    icon: 'sun',
    color: 'neutral',
  });
  world.app.stop();
});

test('no warning: no list, a green tile', async () => {
  const warnings = fixture('warnings_www.json').filter((warning) => warning.idAreaAviso !== 'AVR');
  const world = await createWorld({
    routes: new Map([...ipmaRoutes(), [ENDPOINTS.warnings, warnings]]),
  });
  const widget = await content(world, {}, 'de');
  assert.equal(widget.components.filter((component) => component.type === 'card-list').length, 0);
  const tile = widget.components.find((component) => component.label === 'Warnungen');
  assert.deepEqual([tile.value, tile.color, tile.icon], ['Keine', 'success', 'check-circle']);
  world.app.stop();
});

test('IPMA unreachable, nothing configured: a sentence, never an error', async () => {
  const down = await createWorld({ routes: new Map() });
  const widget = await content(down, {}, 'es');
  assert.deepEqual(validateWidgetContent(widget), []);
  assert.deepEqual(
    widget.components.map((component) => component.text),
    [
      'IPMA · Aveiro',
      'El IPMA no responde por ahora: la previsión aparecerá en la próxima actualización.',
    ],
  );
  assert.equal(widget.ttl_seconds, 60);
  down.app.stop();

  const empty = await createWorld({ config: {} });
  const none = await content(empty, {}, 'es');
  assert.deepEqual(none, notConfiguredContent('es'));
  assert.deepEqual(validateWidgetContent(none), []);
  empty.app.stop();
});

test('a status row holds a day and any weather type (40 characters)', () => {
  for (const lang of LANGS) {
    // "Today", "Tomorrow", or a weekday and a day: "mer. 31".
    const longestDay = Math.max(TEXT.today[lang].length, TEXT.tomorrow[lang].length, 7);
    for (const [id, type] of Object.entries(WEATHER_TYPES)) {
      const label = `${'x'.repeat(longestDay)} · ${type[lang]}`;
      assert.ok(label.length <= 40, `weather ${id} in ${lang}: "${label}"`);
    }
  }
});

test('the day labels are localized', async () => {
  const world = await createWorld({ now: () => NOW });
  const widget = await content(world, {}, 'en');
  const [days] = widget.components.filter((component) => component.type === 'status');
  assert.deepEqual(
    days.items.map((item) => item.label.split(' · ')[0]),
    ['Today', 'Tomorrow', 'Sat 30', 'Sun 31', 'Mon 1'],
  );
  world.app.stop();
});
