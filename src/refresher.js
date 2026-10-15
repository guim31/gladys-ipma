// -----------------------------------------------------------------------------
// The container's own refresh timer.
//
// The core cannot be trusted to poll external devices (Gladys 5.2 skips the
// devices created without `should_poll`, and a device keeps the polling
// fields it was created with: GladysAssistant/Gladys#3198). The devices are
// published with `should_poll: false`, and this timer reads IPMA every
// `refresh_interval` minutes; the core's onPoll stays as a fallback, and does
// nothing while the timer runs.
//
// One cycle reads each country-wide file once (stations, observations,
// warnings, fire risk) and one forecast file per location — only for the
// locations whose device the user added to Gladys: the core drops the states
// of a device it does not know, reading IPMA for it would be traffic for
// nothing. A file read less than half a period ago is reused (a device just
// added gets its states at once, without a new download); a file that cannot
// be read is replaced by its last copy for a few hours, then its features
// simply stop being updated.
// -----------------------------------------------------------------------------

import { refreshMs } from './config.js';
import { buildStates, locationIds } from './device.js';
import { hasFireRisk } from './locations.js';
import { createIssueLog } from './issues.js';
import { buildSnapshot } from './snapshot.js';
import { TRIGGER_KEY, warningEvent } from './warnings.js';
import { MESSAGES } from './i18n.js';

// Gladys shows "no recent value" for a value older than 48 h: an unchanged
// value (a fire risk stuck at 1 all winter) is sent again every 6 hours.
export const HEARTBEAT_MS = 6 * 60 * 60 * 1000;
// The stations barely ever change.
const STATIONS_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// How long a copy stands in for a file IPMA does not serve any more.
const STALE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export const WIDGET_KEY = 'forecast';

/**
 * @param {object} options
 * @param {object} options.gladys GladysIntegration (or the SDK's fake Gladys)
 * @param {ReturnType<import('./ipma.js').createIpmaClient>} options.client
 * @param {() => ReturnType<import('./config.js').normalizeConfig>} options.getConfig
 * @param {ReturnType<import('./warnings.js').createWarningTracker>} options.tracker
 * @param {object} options.logger
 * @param {() => Date} [options.now]
 * @param {boolean} [options.timers] run the periodic timer (tests may turn it off)
 */
export function createRefresher({
  gladys,
  client,
  getConfig,
  tracker,
  logger,
  now = () => new Date(),
  timers = true,
}) {
  const issues = createIssueLog(logger);
  /** source key → { value, at } */
  const cache = new Map();
  /** location id → snapshot */
  const snapshots = new Map();
  /** location id → what the widget shows, to nudge it only on a change */
  const signatures = new Map();
  let lastCycleAt = null;
  let running = null;
  let timer = null;
  let stopped = true;
  let connectionStatus = null;

  const periodMs = () => refreshMs(getConfig());

  /** Read one file, through the cache. Null when unknown. */
  async function source(key, label, loader, maxAgeMs, reads) {
    const cached = cache.get(key);
    const age = cached ? now() - cached.at : Infinity;
    if (age < maxAgeMs) {
      return cached.value;
    }
    reads.attempts += 1;
    try {
      const value = await loader();
      cache.set(key, { value, at: now() });
      issues.ok(key, `IPMA ${label}: available again`);
      return value;
    } catch (err) {
      reads.errors.push(err);
      issues.fail(key, `IPMA ${label}: ${err.message}`);
      return age < STALE_MAX_AGE_MS ? cached.value : null;
    }
  }

  /** The configured locations whose device exists in Gladys. */
  function createdLocations(config) {
    const created = new Set((gladys.devices ?? []).map((device) => device.external_id));
    return config.locations.filter((location) => created.has(locationIds(gladys, location).device));
  }

  async function reportConnection(connected, message) {
    if (connectionStatus === connected) {
      return;
    }
    connectionStatus = connected;
    try {
      await gladys.setConnectionStatus(connected, message);
    } catch (err) {
      connectionStatus = null;
      logger.debug(`Connection status not sent (${err.message})`);
    }
  }

  async function announceWarnings(location, snapshot, config) {
    if (snapshot.warnings === null) {
      return;
    }
    const device = locationIds(gladys, location).device;
    for (const warning of await tracker.fresh(location.id, snapshot.warnings)) {
      try {
        await gladys.publishSceneEvent(
          TRIGGER_KEY,
          warningEvent(device, location, warning, config.language),
        );
        tracker.mark(location.id, warning);
        logger.debug(`${location.name}: warning ${warning.level} ${warning.phenomenon} announced`);
        issues.ok('scene', 'Warning scene events accepted again');
      } catch (err) {
        // Not marked: announced again at the next cycle.
        issues.fail('scene', `Warning scene event refused (${err.message})`);
        return;
      }
    }
  }

  /**
   * One refresh of the given locations (default: the added ones).
   * @returns {Promise<{ snapshots: Map, errors: Error[] }>}
   */
  async function runCycle(locations) {
    const config = getConfig();
    const reads = { attempts: 0, errors: [] };
    if (locations.length === 0) {
      logger.debug('No IPMA device added to Gladys yet: nothing to read');
      return { snapshots: new Map(), errors: reads.errors, nudged: false };
    }
    const fresh = periodMs() / 2;
    const [stations, observations, warnings, fireRisk, forecasts] = await Promise.all([
      source('stations', 'stations', () => client.stations(), STATIONS_MAX_AGE_MS, reads),
      source('observations', 'observations', () => client.observations(), fresh, reads),
      source('warnings', 'warnings', () => client.warnings(), fresh, reads),
      locations.some(hasFireRisk)
        ? source('fireRisk', 'fire risk', () => client.fireRisk(), fresh, reads)
        : null,
      Promise.all(
        locations.map((location) =>
          source(
            `forecast:${location.id}`,
            `forecast of ${location.name}`,
            () => client.forecast(location.id),
            fresh,
            reads,
          ),
        ),
      ),
    ]);

    const at = now();
    const states = [];
    const built = new Map();
    for (const [index, location] of locations.entries()) {
      const snapshot = buildSnapshot({
        location,
        forecast: forecasts[index],
        stations,
        observations,
        warnings,
        fireRisk,
        now: at,
      });
      built.set(location.id, snapshot);
      snapshots.set(location.id, snapshot);
      states.push(...buildStates(gladys, location, snapshot, config.language));
    }

    try {
      const { count } = await gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      logger.debug(`${count} state(s) published for ${locations.length} location(s)`);
      issues.ok('publish', 'States accepted by Gladys again');
    } catch (err) {
      issues.fail('publish', `States refused by Gladys (${err.message})`);
    }

    const created = new Set(createdLocations(config).map((location) => location.id));
    for (const location of locations) {
      if (created.has(location.id)) {
        await announceWarnings(location, built.get(location.id), config);
      }
    }
    await tracker.flush(at);

    // The widget follows the data: nudged when what it shows changed.
    let changed = false;
    for (const [id, snapshot] of built) {
      const signature = JSON.stringify([snapshot.days, snapshot.observation, snapshot.warnings]);
      if (signatures.get(id) !== signature) {
        signatures.set(id, signature);
        changed = true;
      }
    }
    if (changed) {
      gladys.requestWidgetRefresh(WIDGET_KEY);
    }

    // Unreachable: nothing usable at all, not even a recent copy. A partial
    // outage (one forecast file missing) is only logged.
    const usable = [stations, observations, warnings, fireRisk, ...forecasts].some(
      (value) => value !== null,
    );
    if (usable) {
      await reportConnection(true);
    } else {
      await reportConnection(false, MESSAGES.unreachable(reads.errors[0]?.message ?? '?'));
    }
    return { snapshots: built, errors: reads.errors, nudged: changed };
  }

  /** One cycle at a time: a caller arriving during a cycle waits for it. */
  async function cycle({ locations } = {}) {
    while (running) {
      await running.catch(() => {});
    }
    const targets = locations ?? createdLocations(getConfig());
    running = runCycle(targets);
    try {
      const result = await running;
      if (!locations) {
        lastCycleAt = now();
      }
      return result;
    } finally {
      running = null;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = null;
    if (!timers || stopped) {
      return;
    }
    timer = setTimeout(async () => {
      timer = null;
      try {
        await cycle();
        issues.ok('cycle', 'Refresh works again');
      } catch (err) {
        issues.fail('cycle', `Refresh failed (${err.message})`);
      } finally {
        schedule();
      }
    }, periodMs());
  }

  const api = {
    /** The core's onPoll (fallback) and the devices just added. */
    register() {
      gladys.onPoll(() => api.pollFromCore());
      gladys.onDeviceCreated((device) => api.deviceAdded(device));
      gladys.onDeviceUpdated((device) => api.deviceAdded(device));
    },

    /** (Re)start: a new configuration, a (re)connection. Reads now, then every period. */
    async restart() {
      stopped = false;
      schedule();
      await cycle();
    },

    stop() {
      stopped = true;
      clearTimeout(timer);
      timer = null;
    },

    /** The core's onPoll: nothing to do while the timer runs. */
    async pollFromCore() {
      if (lastCycleAt !== null && now() - lastCycleAt < periodMs() * 0.9) {
        return;
      }
      await cycle();
    },

    /**
     * A device was added (or updated) in Gladys: the SDK forgot its states,
     * they are sent now (from the files just read when they are fresh).
     */
    async deviceAdded(device) {
      const config = getConfig();
      const known = config.locations.some(
        (location) => locationIds(gladys, location).device === device.external_id,
      );
      if (!known) {
        return;
      }
      const { nudged } = await cycle();
      // The widget may show this device for the first time.
      if (!nudged) {
        gladys.requestWidgetRefresh(WIDGET_KEY);
      }
    },

    /** Refresh every configured location, added or not (the check action). */
    checkAll: () => cycle({ locations: getConfig().locations }),

    /** The last snapshot of a location, read now when there is none yet. */
    async snapshotOf(location) {
      if (!snapshots.has(location.id)) {
        await cycle({ locations: [location] });
      }
      return snapshots.get(location.id) ?? null;
    },

    /** Forget the connection status reported, so the next cycle reports it again. */
    resetStatus() {
      connectionStatus = null;
    },
  };
  return api;
}
