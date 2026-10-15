// -----------------------------------------------------------------------------
// The integration, wired to a Gladys client.
//
// Kept apart from index.js so the tests run it on the SDK's fake Gladys with
// a fake IPMA: createApp() registers every handler on the client it is given
// (before connect()), and holds the configuration.
// -----------------------------------------------------------------------------

import { normalizeConfig } from './config.js';
import { buildDevice, locationIds } from './device.js';
import { MESSAGES } from './i18n.js';
import { createActions } from './actions.js';
import { createRefresher, WIDGET_KEY } from './refresher.js';
import { createWarningTracker } from './warnings.js';
import { buildForecastContent, notConfiguredContent } from './widgets.js';

/**
 * @param {object} options
 * @param {object} options.gladys GladysIntegration, or the SDK's fake Gladys
 * @param {ReturnType<import('./ipma.js').createIpmaClient>} options.client
 * @param {object} options.logger
 * @param {string|null} [options.dataDir] the writable volume (/data)
 * @param {() => Date} [options.now]
 * @param {boolean} [options.timers]
 */
export function createApp({ gladys, client, logger, dataDir = null, now, timers = true }) {
  let config = normalizeConfig();
  const getConfig = () => config;
  const tracker = createWarningTracker({ dataDir, logger });
  const refresher = createRefresher({ gladys, client, getConfig, tracker, logger, now, timers });

  /** Publish the devices of the configured locations and report the status. */
  async function publishDevices() {
    await gladys.publishDiscoveredDevices(
      config.locations.map((location) => buildDevice(gladys, location, config.language)),
    );
    if (config.locations.length === 0) {
      await gladys.setConnectionStatus(false, MESSAGES.notConfigured);
      refresher.resetStatus();
    }
  }

  /** Take a new raw configuration into account: devices, then a refresh. */
  async function applyConfig(raw) {
    const previous = config;
    config = normalizeConfig(raw);
    const names = config.locations.map((location) => location.name).join(', ') || 'none';
    if (JSON.stringify(previous) !== JSON.stringify(config)) {
      logger.info(
        `Locations: ${names}; refresh every ${config.refreshMinutes} min; language ${config.language}`,
      );
    }
    if (config.unknownLocations.length > 0) {
      logger.warn(`Unknown locations ignored: ${config.unknownLocations.join(', ')}`);
    }
    if (config.droppedLocations > 0) {
      logger.warn(`${config.droppedLocations} location(s) beyond the first 10 ignored`);
    }
    await publishDevices();
    await refresher.restart();
  }

  const actions = createActions({ gladys, logger, applyConfig, refresher, getConfig });

  gladys.onScanRequest(async () => {
    logger.debug('Scan requested: publishing the devices');
    await publishDevices();
  });

  refresher.register();

  for (const [key, handler] of Object.entries(actions)) {
    gladys.onAction(key, handler);
  }

  gladys.onConfigUpdated(async (raw) => {
    logger.info('Configuration updated');
    await applyConfig(raw);
  });

  gladys.onWidgetGet(WIDGET_KEY, async ({ settings, language }) => {
    const location =
      config.locations.find(
        (candidate) => locationIds(gladys, candidate).device === settings?.device,
      ) ?? config.locations[0];
    if (!location) {
      return notConfiguredContent(language);
    }
    const snapshot = await refresher.snapshotOf(location);
    return buildForecastContent({ gladys, location, snapshot, language });
  });

  gladys.on('connected', async () => {
    try {
      await applyConfig(await gladys.getConfig());
    } catch (err) {
      logger.error(`Initialization failed (${err.message})`);
      await gladys.setConnectionStatus(false, MESSAGES.initFailed).catch(() => {});
    }
  });

  gladys.on('disconnected', () => refresher.stop());

  return {
    getConfig,
    refresher,
    stop: () => refresher.stop(),
  };
}
