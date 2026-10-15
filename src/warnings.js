// -----------------------------------------------------------------------------
// The `warning_issued` scene trigger: fired once for each IPMA warning a
// location gets, active or upcoming — a yellow heat warning, then the same
// warning raised to orange (a new level is a new warning).
//
// What this adds to the `warning_level` feature: it fires as soon as IPMA
// issues a warning, often the day before it starts, and it carries the
// phenomenon, the period and IPMA's text, which a scene can filter on and
// put in a notification.
//
// The warnings already announced are remembered in /data (the one writable
// volume), so a restart of the container does not announce them again; they
// are forgotten a day after their end.
// -----------------------------------------------------------------------------

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LEVELS, PHENOMENA } from './codes.js';

export const TRIGGER_KEY = 'warning_issued';
const STATE_FILE = 'announced-warnings.json';
const FORGET_AFTER_MS = 24 * 60 * 60 * 1000;

/** Identity of a warning for a location: a new level or period is a new warning. */
export const warningKey = (locationId, warning) =>
  [locationId, warning.area, warning.phenomenon, warning.level, warning.start].join('|');

/**
 * The scene event of a warning (flat data, see the manifest variables).
 * @param {string} deviceExternalId
 * @param {import('./locations.js').Location} location
 * @param {object} warning a warning of a snapshot (src/snapshot.js)
 * @param {string} language language of the labels
 */
export function warningEvent(deviceExternalId, location, warning, language) {
  return {
    device: deviceExternalId,
    location: location.name,
    level: warning.level,
    level_label: LEVELS[warning.level][language],
    phenomenon: warning.phenomenon,
    phenomenon_label: PHENOMENA[warning.phenomenon][language],
    starts_at: warning.startsAt.toISOString(),
    ends_at: warning.endsAt.toISOString(),
    active: warning.active,
    description: warning.text.slice(0, 1000),
  };
}

/**
 * @param {object} options
 * @param {string|null} options.dataDir where to remember the announced
 *   warnings (null: in memory only)
 * @param {{ warn: Function, debug: Function }} options.logger
 */
export function createWarningTracker({ dataDir, logger }) {
  /** key → end of the warning (ms) */
  let announced = new Map();
  let loaded = false;
  let saveFailed = false;

  async function load() {
    if (loaded) {
      return;
    }
    loaded = true;
    if (!dataDir) {
      return;
    }
    try {
      const content = JSON.parse(await readFile(join(dataDir, STATE_FILE), 'utf8'));
      announced = new Map(Object.entries(content.announced ?? {}).map(([k, v]) => [k, Number(v)]));
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.warn(`Announced warnings unreadable, starting afresh (${err.message})`);
      }
    }
  }

  async function save() {
    if (!dataDir) {
      return;
    }
    try {
      await mkdir(dataDir, { recursive: true });
      const path = join(dataDir, STATE_FILE);
      await writeFile(`${path}.tmp`, JSON.stringify({ announced: Object.fromEntries(announced) }));
      await rename(`${path}.tmp`, path);
      saveFailed = false;
    } catch (err) {
      // Said once: the trigger keeps working, a restart may announce again.
      if (!saveFailed) {
        logger.warn(`Cannot remember the announced warnings in ${dataDir} (${err.message})`);
      }
      saveFailed = true;
    }
  }

  let dirty = false;

  return {
    /** The warnings of a location not announced yet. */
    async fresh(locationId, warnings) {
      await load();
      return warnings.filter((warning) => !announced.has(warningKey(locationId, warning)));
    },

    /** A warning was announced (its scene event accepted by Gladys). */
    mark(locationId, warning) {
      announced.set(warningKey(locationId, warning), warning.endsAt.getTime());
      dirty = true;
    },

    /** Forget the warnings over for a day, and save what changed. */
    async flush(now) {
      for (const [key, end] of announced) {
        if (end + FORGET_AFTER_MS < now.getTime()) {
          announced.delete(key);
          dirty = true;
        }
      }
      if (dirty) {
        dirty = false;
        await save();
      }
    },
  };
}
