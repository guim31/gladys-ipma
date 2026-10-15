#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Read the real IPMA data of one location with the integration's own code,
// without Gladys: the files, what the device would publish, the widget.
//
//   node scripts/probe.mjs <location>        e.g. Aveiro, "Lagoa (Faro)", 1010500
//   node scripts/probe.mjs <location> en     language of the texts (default fr)
//
// Read only, public data: no account, no key, nothing sensitive printed.
// Exit code 0 when every file was read, 1 otherwise, 2 on a bad argument.
// -----------------------------------------------------------------------------

import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { buildDevice, buildStates } from '../src/device.js';
import { createIpmaClient } from '../src/ipma.js';
import { findLocation, hasFireRisk, locationLabel } from '../src/locations.js';
import { buildSnapshot } from '../src/snapshot.js';
import { buildForecastContent } from '../src/widgets.js';

const [query, language = 'fr'] = process.argv.slice(2);
const location = findLocation(query);
if (!location) {
  console.error(
    `Unknown location "${query ?? ''}". Give an IPMA name or id, e.g. Aveiro, 1010500.`,
  );
  process.exit(2);
}
console.log(
  `Location: ${locationLabel(location)} — id ${location.id}, warning area ${location.area}`,
);

const client = createIpmaClient();
let failures = 0;

async function read(label, load, describe) {
  const started = Date.now();
  try {
    const value = await load();
    console.log(`  OK   ${label} (${Date.now() - started} ms): ${describe(value)}`);
    return value;
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${label}: ${err.message}`);
    return null;
  }
}

console.log('IPMA files:');
const forecast = await read(
  'forecast',
  () => client.forecast(location.id),
  (value) =>
    `${value.days.length} days from ${value.days[0].date}, updated ${value.updatedAt}; today ` +
    JSON.stringify(value.days[0]),
);
const stations = await read(
  'stations',
  () => client.stations(),
  (value) => `${value.length} stations`,
);
const observations = await read(
  'observations',
  () => client.observations(),
  (value) => {
    const last = [...value.values()].flat().reduce((a, b) => (a.time > b.time ? a : b));
    return `${value.size} stations, last record ${last.time.toISOString()}`;
  },
);
const warnings = await read(
  'warnings',
  () => client.warnings(),
  (value) =>
    `${value.length} non-green warnings; area ${location.area}: ` +
    JSON.stringify(value.filter((warning) => warning.area === location.area)),
);
const fireRisk = hasFireRisk(location)
  ? await read(
      'fire risk',
      () => client.fireRisk(),
      (value) =>
        `${value.byDico.size} municipalities for ${value.date}; here ${value.byDico.get(location.dico)}`,
    )
  : null;

const now = new Date();
const snapshot = buildSnapshot({
  location,
  forecast,
  stations,
  observations,
  warnings,
  fireRisk,
  now,
});
console.log(
  snapshot.observation
    ? `Station: ${snapshot.observation.station.name} (${snapshot.observation.station.distance} km), ` +
        `${snapshot.observation.time.toISOString()}`
    : 'Station: none within 50 km with a record of the last 3 hours',
);

const gladys = createFakeGladys();
const device = buildDevice(gladys, location, language);
const names = new Map(device.features.map((feature) => [feature.external_id, feature.name]));
console.log(`\nDevice "${device.name}", ${device.features.length} features; states:`);
for (const state of buildStates(gladys, location, snapshot, language)) {
  const value = state.text ?? state.state;
  console.log(`  ${names.get(state.device_feature_external_id).padEnd(34)} ${value}`);
}

const content = buildForecastContent({ gladys, location, snapshot, language });
const problems = validateWidgetContent(content);
console.log(
  `\nWidget: ${content.components.length} components, ` +
    (problems.length === 0 ? 'valid' : `problems: ${JSON.stringify(problems)}`),
);
for (const component of content.components) {
  const summary =
    component.text ??
    component.value ??
    component.device_feature ??
    (component.items ?? []).map((item) => item.title ?? `${item.label}: ${item.value}`).join(' | ');
  console.log(
    `  ${component.type.padEnd(10)} ${typeof summary === 'object' ? JSON.stringify(summary) : summary}`,
  );
}

process.exit(failures === 0 ? 0 : 1);
