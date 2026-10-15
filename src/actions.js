// -----------------------------------------------------------------------------
// The buttons of the Configuration screen (manifest `actions`).
//
// - `nearest_location`: pick the IPMA location closest to a house of Gladys.
//   The house list is a `source: "houses"` select; its coordinates are read
//   through getHouses() (manifest `location: true`), only when the user taps
//   the button, and never written to the logs.
// - `check`: read IPMA now for every configured location and say what came
//   back, added to Gladys or not.
// -----------------------------------------------------------------------------

import { MESSAGES } from './i18n.js';
import { locationLabel, nearestLocation } from './locations.js';

// Further than this, the house is not in Portugal: IPMA has nothing for it.
export const MAX_HOUSE_DISTANCE_KM = 60;

/**
 * @param {object} options
 * @param {object} options.gladys
 * @param {object} options.logger
 * @param {(raw: object) => Promise<void>} options.applyConfig apply a new raw configuration
 * @param {ReturnType<import('./refresher.js').createRefresher>} options.refresher
 * @param {() => ReturnType<import('./config.js').normalizeConfig>} options.getConfig
 */
export function createActions({ gladys, logger, applyConfig, refresher, getConfig }) {
  return {
    async nearest_location(fields) {
      logger.info('Action nearest_location');
      const houses = await gladys.getHouses();
      const house = houses.find((candidate) => candidate.selector === fields.house);
      if (!house) {
        return MESSAGES.houseNotFound;
      }
      if (typeof house.latitude !== 'number' || typeof house.longitude !== 'number') {
        return MESSAGES.houseNotLocated(house.name);
      }
      const { location, distance } = nearestLocation(house);
      const km = Math.round(distance);
      if (distance > MAX_HOUSE_DISTANCE_KM) {
        return MESSAGES.houseTooFar(house.name, km);
      }
      const raw = { ...(await gladys.getConfig()), location: String(location.id) };
      await gladys.setConfig({ location: String(location.id) });
      await applyConfig(raw);
      logger.info(`Location set to ${location.name} (${location.id}) from a house`);
      return MESSAGES.locationSet(locationLabel(location), house.name, km);
    },

    async check() {
      logger.info('Action check');
      const config = getConfig();
      if (config.locations.length === 0) {
        return MESSAGES.notConfigured;
      }
      const { snapshots, errors } = await refresher.checkAll();
      const lines = config.locations.map((location) => {
        const snapshot = snapshots.get(location.id);
        const observation = snapshot?.observation ?? null;
        return MESSAGES.checkLocation({
          name: location.name,
          temperature: observation?.temperature ?? null,
          station: observation?.station.name ?? '',
          min: snapshot?.todayForecast?.min ?? null,
          max: snapshot?.todayForecast?.max ?? null,
          warnings: snapshot?.warnings ? snapshot.warnings.length : null,
        });
      });
      if (config.unknownLocations.length > 0) {
        lines.push(MESSAGES.unknownLocations(config.unknownLocations.join(', ')));
      }
      if (errors.length > 0) {
        lines.push(MESSAGES.checkFailed(errors.map((err) => err.message).join('; ')));
      }
      return MESSAGES.checkResult(lines);
    },
  };
}
