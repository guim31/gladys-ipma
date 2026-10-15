// -----------------------------------------------------------------------------
// Every text Gladys shows exists in the four languages of its interface
// (English, French, German, Spanish): the manifest, the message tables of the
// code, the translations of IPMA's codes, and the four documentation files,
// which share the same sections. German says "du", never the polite "Sie".
//
// One exception, on purpose: the 423 labels of the location select are
// Portuguese place names, the same in every language, so they carry the
// mandatory `en` text only (Gladys falls back to it) — four copies would push
// the manifest over the store's 100 KB.
// -----------------------------------------------------------------------------

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  FIRE_RISKS,
  LEVELS,
  PHENOMENA,
  WEATHER_TYPES,
  WIND_CLASSES,
  uvLevel,
} from '../src/codes.js';
import { LANGUAGES } from '../src/config.js';
import { MESSAGES, NAMES, TEXT } from '../src/i18n.js';
import { notConfiguredContent } from '../src/widgets.js';

const manifest = JSON.parse(
  await readFile(new URL('../gladys-assistant-integration.json', import.meta.url), 'utf8'),
);

const LANGS = ['en', 'fr', 'de', 'es'];
const POLITE_GERMAN = /(?<!\p{L})(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)(?!\p{L})/u;

// Upper bounds, in characters: what the Gladys interface shows without cutting.
const MAX = {
  catalog: 100,
  widgetLabel: 30,
  label: 60,
  placeholder: 60,
  description: 300,
  message: 300,
  short: 24,
  featureName: 40,
  code: 30,
};

const sorted = (keys) => [...keys].sort();

/** Checks one multi-language object; returns its problems. */
function problems(value, path, max) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [`${path} must be a multi-language object`];
  }
  const found = [];
  if (JSON.stringify(sorted(Object.keys(value))) !== JSON.stringify(sorted(LANGS))) {
    found.push(`${path} has [${Object.keys(value)}], expected exactly [${LANGS}]`);
  }
  for (const lang of LANGS) {
    if (lang in value) {
      found.push(...textProblems(value[lang], `${path}.${lang}`, lang, max));
    }
  }
  return found;
}

function textProblems(text, path, lang, max) {
  if (typeof text !== 'string' || text.trim() === '') {
    return [`${path} is empty`];
  }
  const found = [];
  if (text.length > max) {
    found.push(`${path} has ${text.length} characters (${max} at most)`);
  }
  if (lang === 'de' && POLITE_GERMAN.test(text)) {
    found.push(`${path} uses the polite form: "${text}"`);
  }
  return found;
}

const LOCATION_OPTION = /^manifest\.config_schema\[\d+\]\.options\[\d+\]\.label$/;
const isLocationOption = (path, root) => {
  if (!LOCATION_OPTION.test(path)) {
    return false;
  }
  const index = Number(path.match(/config_schema\[(\d+)\]/)[1]);
  return root.config_schema[index].key === 'location';
};

/** Every multi-language object of the manifest, with its length limit. */
function manifestTexts(root) {
  const texts = [];
  const walk = (value, path, key) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`, key));
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const isText =
      ['label', 'description', 'placeholder'].includes(key) ||
      Object.keys(value).some((child) => LANGS.includes(child));
    if (isText) {
      const max =
        path === 'manifest.description' || /^manifest\.widgets\[\d+\]\.description$/.test(path)
          ? MAX.catalog
          : /^manifest\.widgets\[\d+\]\.label$/.test(path)
            ? MAX.widgetLabel
            : (MAX[key] ?? MAX.label);
      texts.push({ path, value, max, placeName: isLocationOption(path, root) });
      return;
    }
    for (const [child, item] of Object.entries(value)) {
      walk(item, `${path}.${child}`, child);
    }
  };
  walk(root, 'manifest', null);
  return texts;
}

const manifestProblems = (root) =>
  manifestTexts(root).flatMap(({ path, value, max, placeName }) =>
    placeName
      ? JSON.stringify(Object.keys(value)) === '["en"]'
        ? textProblems(value.en, `${path}.en`, 'en', MAX.label)
        : [`${path}: a place name carries its "en" text only`]
      : problems(value, path, max),
  );

test('the configuration offers the four languages', () => {
  assert.deepEqual(LANGUAGES, LANGS);
  assert.deepEqual(Object.keys(NAMES), LANGS);
});

test('every text of the manifest is in English, French, German and Spanish', () => {
  const texts = manifestTexts(manifest);
  assert.ok(texts.filter((text) => !text.placeName).length >= 53, 'texts found in the manifest');
  assert.equal(texts.filter((text) => text.placeName).length, 423);
  assert.deepEqual(manifestProblems(manifest), []);
});

test('the name is the same everywhere, the catalog description long enough', () => {
  assert.equal(typeof manifest.name, 'string');
  for (const lang of LANGS) {
    assert.ok(manifest.description[lang].length >= 10, `description.${lang} is too short`);
  }
});

// Tables written one language at a time: same keys everywhere, no empty text.
function tableProblems(table, name, max) {
  const found = [];
  if (JSON.stringify(sorted(Object.keys(table))) !== JSON.stringify(sorted(LANGS))) {
    found.push(`${name} has [${Object.keys(table)}], expected exactly [${LANGS}]`);
  }
  for (const lang of LANGS) {
    const entries = table[lang] ?? {};
    if (
      JSON.stringify(sorted(Object.keys(entries))) !== JSON.stringify(sorted(Object.keys(table.en)))
    ) {
      found.push(`${name}.${lang} does not have the keys of ${name}.en`);
    }
    for (const [key, value] of Object.entries(entries)) {
      found.push(...textProblems(value, `${name}.${lang}.${key}`, lang, max));
    }
  }
  return found;
}

/** Tables keyed by code, each entry a multi-language object (extra keys ignored). */
function codeProblems(table, name, max = MAX.code) {
  return Object.entries(table).flatMap(([code, entry]) =>
    problems(
      Object.fromEntries(LANGS.filter((lang) => lang in entry).map((lang) => [lang, entry[lang]])),
      `${name}.${code}`,
      max,
    ),
  );
}

test('the feature names exist in every language', () => {
  assert.deepEqual(tableProblems(NAMES, 'NAMES', MAX.featureName), []);
});

test('the short texts and the messages exist in every language', () => {
  const found = [
    ...Object.entries(TEXT).flatMap(([key, value]) => problems(value, `TEXT.${key}`, MAX.short)),
    ...Object.entries(MESSAGES).flatMap(([key, value]) => {
      if (typeof value !== 'function') {
        return problems(value, `MESSAGES.${key}`, MAX.message);
      }
      const samples = {
        unreachable: ['HTTP 503'],
        unknownLocations: ['Atlantis'],
        houseNotLocated: ['Casa'],
        houseTooFar: ['Maison', 1450],
        locationSet: ['Braga (Braga)', 'Casa', 3],
        checkResult: [[{ en: 'a', fr: 'a', de: 'a', es: 'a' }]],
        checkLocation: [
          { name: 'Aveiro', temperature: 18.2, station: 'Aveiro', min: 12, max: 20, warnings: 1 },
        ],
        checkFailed: ['HTTP 503'],
      };
      assert.ok(samples[key], `no sample for MESSAGES.${key}`);
      return problems(value(...samples[key]), `MESSAGES.${key}`, MAX.message);
    }),
    ...LANGS.flatMap((lang) =>
      notConfiguredContent(lang).components.flatMap((component, index) =>
        textProblems(component.text, `notConfigured.${lang}[${index}]`, lang, MAX.message),
      ),
    ),
  ];
  assert.deepEqual(found, []);
});

test('the IPMA codes are translated in every language', () => {
  const uv = Object.fromEntries([1, 4, 6, 9, 11].map((index) => [index, uvLevel(index)]));
  assert.deepEqual(
    [
      ...codeProblems(WEATHER_TYPES, 'WEATHER_TYPES'),
      ...codeProblems(PHENOMENA, 'PHENOMENA'),
      ...codeProblems(LEVELS, 'LEVELS', 12),
      ...codeProblems(WIND_CLASSES, 'WIND_CLASSES', 12),
      ...codeProblems(FIRE_RISKS, 'FIRE_RISKS', 12),
      ...codeProblems(uv, 'uvLevel', 12),
    ],
    [],
  );
});

const docs = Object.fromEntries(
  await Promise.all(
    LANGS.map(async (lang) => [
      lang,
      await readFile(new URL(`../docs/${lang}.md`, import.meta.url), 'utf8'),
    ]),
  ),
);
const outline = (text) =>
  text
    .split('\n')
    .filter((line) => /^#{1,4} /.test(line))
    .map((line) => line.match(/^#+/)[0].length);

test('the four documentation files have the same sections', () => {
  for (const lang of LANGS) {
    assert.ok(docs[lang].length >= 300, `docs/${lang}.md is too short for the store`);
    assert.deepEqual(outline(docs[lang]), outline(docs.en), `docs/${lang}.md sections`);
  }
  assert.ok(outline(docs.en).filter((level) => level === 2).length >= 8);
});

test('the documentation says it was developed without a real Gladys, and is not affiliated', () => {
  const markers = {
    en: [/not affiliated with\s+IPMA/i, /feedback\s+welcome/i],
    fr: [/sans lien avec\s+l’IPMA/i, /retours\s+bienvenus/i],
    de: [/nicht mit dem\s+IPMA verbunden/i, /Rückmeldungen\s+willkommen/i],
    es: [/sin relación con\s+el IPMA/i, /comentarios\s+son\s+bienvenidos/i],
  };
  for (const lang of LANGS) {
    for (const marker of markers[lang]) {
      assert.match(docs[lang], marker, `docs/${lang}.md`);
    }
    if (lang === 'de') {
      assert.ok(!POLITE_GERMAN.test(docs.de), 'docs/de.md uses the polite form');
    }
  }
});

test('the guard catches a missing language, an empty text and the polite German form', () => {
  assert.equal(problems({ en: 'Rain', fr: 'Pluie', de: 'Regen' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'Rain', fr: 'Pluie', de: '', es: 'Lluvia' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a', es: 'a', it: 'a' }, 'x', 60).length, 1);
  assert.equal(problems({ en: 'a', fr: 'a', de: 'a'.repeat(61), es: 'a' }, 'x', 60).length, 1);
  for (const polite of ['Wählen Sie', 'Ihr Haus', 'Ihre Orte', 'mit Ihrem', 'Ihren', 'Ihrer']) {
    assert.equal(problems({ en: 'a', fr: 'a', de: polite, es: 'a' }, 'x', 60).length, 1, polite);
  }
  assert.deepEqual(
    problems({ en: 'a', fr: 'a', de: 'Siebenschläfer, ihre', es: 'a' }, 'x', 60),
    [],
  );

  // A manifest text forgotten in German is found; so is a translated place name.
  const forgotten = structuredClone(manifest);
  delete forgotten.scene_triggers[0].fields[1].label.de;
  const location = forgotten.config_schema.find((field) => field.key === 'location');
  location.options[0].label.fr = 'x';
  assert.deepEqual(manifestProblems(forgotten), [
    `manifest.config_schema[1].options[0].label: a place name carries its "en" text only`,
    'manifest.scene_triggers[0].fields[1].label has [en,fr,es], expected exactly [en,fr,de,es]',
  ]);
});
