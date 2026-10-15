// -----------------------------------------------------------------------------
// Consistency checks between `gladys-assistant-integration.json` and the code.
// The manifest is validated by the store indexer, but nothing there can know
// which handlers the code actually registers — these tests keep both in sync.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../src/app.js';
import { DEFAULT_CONFIG, LANGUAGES, REFRESH_INTERVALS } from '../src/config.js';
import { PHENOMENA, LEVELS } from '../src/codes.js';
import { LOCATIONS, locationLabel } from '../src/locations.js';
import { warningEvent } from '../src/warnings.js';
import { createFakeFetch, createRecordingLogger } from './helpers/world.js';
import { createIpmaClient } from '../src/ipma.js';

const manifestUrl = new URL('../gladys-assistant-integration.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

// Every list of form fields the manifest can declare (same field grammar).
const allFields = [
  ...(manifest.config_schema ?? []),
  ...[
    ...(manifest.actions ?? []),
    ...(manifest.scene_triggers ?? []),
    ...(manifest.scene_actions ?? []),
  ].flatMap((item) => item.fields ?? []),
  ...(manifest.widgets ?? []).flatMap((widget) => widget.settings ?? []),
];

const keysOf = (list) => (list ?? []).map((entry) => entry.key);

/** The handlers the integration registers, by kind. */
function registeredHandlers() {
  const gladys = createFakeGladys();
  const registered = { action: [], widget: [], sceneAction: [] };
  for (const [method, kind] of [
    ['onAction', 'action'],
    ['onWidgetGet', 'widget'],
    ['onSceneAction', 'sceneAction'],
  ]) {
    const original = gladys[method].bind(gladys);
    gladys[method] = (key, handler) => {
      registered[kind].push(key);
      return original(key, handler);
    };
  }
  createApp({
    gladys,
    client: createIpmaClient({ fetch: createFakeFetch().fetch }),
    logger: createRecordingLogger(),
    timers: false,
  });
  return registered;
}

function minGladysVersion() {
  const match = manifest.gladys_version.match(/>=\s*(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, 'gladys_version must declare a minimum version');
  return match.slice(1).map(Number);
}

function isAtLeast(version, required) {
  for (let i = 0; i < required.length; i += 1) {
    if (version[i] !== required[i]) {
      return version[i] > required[i];
    }
  }
  return true;
}

test('the store limits: size, name, description, categories, transports', async () => {
  // The store indexer refuses a manifest over 100 KB.
  const { size } = await stat(manifestUrl);
  assert.ok(size < 100 * 1024, `the manifest weighs ${size} bytes`);
  assert.equal(manifest.name, 'IPMA');
  assert.ok(manifest.name.length >= 3 && manifest.name.length <= 30);
  for (const [lang, text] of Object.entries(manifest.description)) {
    assert.ok(text.length >= 10 && text.length <= 100, `description.${lang}: ${text.length}`);
  }
  assert.deepEqual(manifest.categories, ['environment']);
  // A public cloud API, nothing on the local network.
  assert.deepEqual(manifest.transports, ['cloud']);
  assert.equal(manifest.type, 'device');
});

test('the manifest version is the package version, and the image is tagged with it', () => {
  assert.equal(manifest.version, pkg.version, 'manifest version must match package.json');
  assert.equal(manifest.docker_image, `ghcr.io/guim31/gladys-ipma:${manifest.version}`);
});

test('the Gladys version covers every capability used', () => {
  // categories: 4.86; widgets, scene triggers: 5.1; source "houses": 5.2.
  assert.ok(isAtLeast(minGladysVersion(), [5, 2, 0]), manifest.gladys_version);
  assert.ok(allFields.some((field) => field.source === 'houses'));
});

test('every action, widget and scene action has a handler, and vice versa', () => {
  const registered = registeredHandlers();
  assert.deepEqual(registered.action.sort(), keysOf(manifest.actions).sort());
  assert.deepEqual(registered.widget.sort(), keysOf(manifest.widgets).sort());
  assert.deepEqual(registered.sceneAction.sort(), keysOf(manifest.scene_actions).sort());
});

test('the house coordinates are requested, and only read by the house action', async () => {
  // getHouses() is a 403 without `location: true`.
  assert.equal(manifest.location, true);
  const sources = await Promise.all(
    ['src/app.js', 'src/refresher.js', 'src/actions.js'].map((path) =>
      readFile(new URL(`../${path}`, import.meta.url), 'utf8'),
    ),
  );
  assert.deepEqual(
    sources.map((source) => source.includes('getHouses(')),
    [false, false, true],
  );
});

test('the scene trigger declares what the code sends', () => {
  const [trigger] = manifest.scene_triggers;
  assert.equal(trigger.key, 'warning_issued');
  const fields = Object.fromEntries(trigger.fields.map((field) => [field.key, field]));
  assert.equal(fields.device.source, 'devices');
  assert.deepEqual(
    fields.level.options.map((option) => option.value),
    Object.keys(LEVELS).filter((level) => level !== 'green'),
  );
  assert.deepEqual(
    fields.phenomenon.options.map((option) => option.value).sort(),
    Object.keys(PHENOMENA).sort(),
  );
  // Every key of the event is a declared filter or variable (others are dropped).
  const event = warningEvent(
    'ext:x:location:1',
    LOCATIONS[0],
    {
      level: 'red',
      phenomenon: 'wind',
      startsAt: new Date(0),
      endsAt: new Date(0),
      active: true,
      text: 'Vento forte',
    },
    'en',
  );
  const declared = new Set([...keysOf(trigger.fields), ...keysOf(trigger.variables)]);
  assert.deepEqual(
    Object.keys(event).filter((key) => !declared.has(key)),
    [],
  );
  for (const variable of trigger.variables) {
    assert.ok(variable.key in event, `variable ${variable.key} is never sent`);
  }
});

test('config_schema defaults stay consistent with DEFAULT_CONFIG', () => {
  for (const field of manifest.config_schema) {
    if (field.default !== undefined) {
      assert.equal(DEFAULT_CONFIG[field.key], field.default, field.key);
    }
  }
  const field = (key) => manifest.config_schema.find((entry) => entry.key === key);
  assert.deepEqual(
    field('refresh_interval').options.map((option) => option.value),
    REFRESH_INTERVALS,
  );
  assert.deepEqual(
    field('language').options.map((option) => option.value),
    LANGUAGES,
  );
});

test('the location select lists every IPMA location, by its id', () => {
  const field = manifest.config_schema.find((entry) => entry.key === 'location');
  assert.equal(field.required, true);
  assert.equal(field.options.length, LOCATIONS.length);
  const byValue = new Map(field.options.map((option) => [option.value, option.label]));
  for (const location of LOCATIONS) {
    assert.deepEqual(byValue.get(String(location.id)), { en: locationLabel(location) });
  }
});

test('section fields are purely presentational', () => {
  const sections = manifest.config_schema.filter((f) => f.type === 'section');
  for (const section of sections) {
    assert.equal(section.required, undefined);
    assert.equal(section.default, undefined);
    assert.equal(section.placeholder, undefined);
    assert.ok(!(section.key in DEFAULT_CONFIG));
    for (const link of section.links ?? []) {
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test('dynamic selects declare a known source and no static options', () => {
  for (const field of allFields.filter((f) => f.source !== undefined)) {
    assert.ok(['devices', 'houses'].includes(field.source), field.key);
    assert.equal(field.options, undefined, field.key);
    assert.equal(field.default, undefined, field.key);
  }
});

test('no secret in the configuration: nothing to leak', () => {
  assert.deepEqual(
    allFields.filter((field) => ['secret', 'oauth2', 'account_link'].includes(field.type)),
    [],
  );
});

test('field placeholders are multi-language objects', () => {
  for (const field of allFields.filter((f) => f.placeholder !== undefined)) {
    assert.equal(typeof field.placeholder, 'object', field.key);
    assert.ok(field.placeholder.en, field.key);
  }
});
