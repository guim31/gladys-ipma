// -----------------------------------------------------------------------------
// Client of the IPMA API (api.ipma.pt), read only, no account, no key.
//
// Five files are read, the same ones as the Home Assistant integration
// (through the pyipma library):
//   - public-data/forecast/aggregate/<id>.json  forecast of ONE location:
//     10 daily entries (idPeriodo 24) plus 3-hourly and hourly ones;
//   - open-data/.../stations/stations.json      the weather stations;
//   - open-data/.../stations/observations.json  the last 24 hours of every
//     station (about 1 MB);
//   - open-data/forecast/warnings/warnings_www.json  the warnings of every
//     area, green ones included;
//   - open-data/forecast/meteorology/rcm/rcm-d0.json  today's fire risk of
//     every mainland municipality.
// Every file but the forecast covers the whole country: one read serves all
// the configured locations.
//
// IPMA marks a missing value with -99 (as a number or a string): it becomes
// null here, so the rest of the code never publishes it.
// -----------------------------------------------------------------------------

import { phenomenonKey, LEVELS } from './codes.js';

const BASE = 'https://api.ipma.pt';

export const ENDPOINTS = {
  forecast: (id) => `${BASE}/public-data/forecast/aggregate/${id}.json`,
  stations: `${BASE}/open-data/observation/meteorology/stations/stations.json`,
  observations: `${BASE}/open-data/observation/meteorology/stations/observations.json`,
  warnings: `${BASE}/open-data/forecast/warnings/warnings_www.json`,
  fireRisk: `${BASE}/open-data/forecast/meteorology/rcm/rcm-d0.json`,
};

export class IpmaError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'IpmaError';
    this.status = status;
  }
}

/** A number of an IPMA file, null when missing (-99, "", null, garbage). */
export function ipmaNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= -99) {
    return null;
  }
  return number;
}

function expectArray(raw, what) {
  if (!Array.isArray(raw)) {
    throw new IpmaError(`unexpected ${what} format`);
  }
  return raw;
}

/**
 * Daily forecast of the aggregate file, sorted by date.
 * @returns {{ updatedAt: string|null, days: Array<{ date: string, min: number|null,
 *   max: number|null, rainProbability: number|null, weatherType: number|null,
 *   windClass: number|null, windDirection: string|null, uv: number|null }> }}
 */
export function parseForecast(raw) {
  const entries = expectArray(raw, 'forecast');
  let updatedAt = null;
  const days = [];
  for (const entry of entries) {
    if (!entry || Number(entry.idPeriodo) !== 24 || typeof entry.dataPrev !== 'string') {
      continue;
    }
    if (
      typeof entry.dataUpdate === 'string' &&
      (updatedAt === null || entry.dataUpdate > updatedAt)
    ) {
      updatedAt = entry.dataUpdate;
    }
    days.push({
      date: entry.dataPrev.slice(0, 10),
      min: ipmaNumber(entry.tMin),
      max: ipmaNumber(entry.tMax),
      rainProbability: ipmaNumber(entry.probabilidadePrecipita),
      weatherType: ipmaNumber(entry.idTipoTempo),
      windClass: ipmaNumber(entry.idFfxVento),
      windDirection: typeof entry.ddVento === 'string' ? entry.ddVento : null,
      uv: ipmaNumber(entry.iUv),
    });
  }
  if (days.length === 0) {
    throw new IpmaError('forecast without daily entries');
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { updatedAt, days };
}

/** @returns {Array<{ id: number, name: string, latitude: number, longitude: number }>} */
export function parseStations(raw) {
  return expectArray(raw, 'stations')
    .map((feature) => {
      const [longitude, latitude] = feature?.geometry?.coordinates ?? [];
      return {
        id: Number(feature?.properties?.idEstacao),
        name: String(feature?.properties?.localEstacao ?? '').trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      };
    })
    .filter(
      (station) =>
        Number.isFinite(station.id) &&
        Number.isFinite(station.latitude) &&
        Number.isFinite(station.longitude),
    );
}

/**
 * Observations by station id, oldest first. The timestamps of the file are
 * UTC ("2022-07-28T06:00").
 * @returns {Map<number, Array<{ time: Date, temperature: number|null,
 *   humidity: number|null, pressure: number|null, windSpeed: number|null,
 *   precipitation: number|null }>>}
 */
export function parseObservations(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new IpmaError('unexpected observations format');
  }
  const byStation = new Map();
  for (const [timestamp, stations] of Object.entries(raw)) {
    const time = new Date(`${timestamp.slice(0, 16)}:00Z`);
    if (Number.isNaN(time.getTime()) || !stations || typeof stations !== 'object') {
      continue;
    }
    for (const [id, values] of Object.entries(stations)) {
      if (!values) {
        continue;
      }
      const record = {
        time,
        temperature: ipmaNumber(values.temperatura),
        humidity: ipmaNumber(values.humidade),
        pressure: ipmaNumber(values.pressao),
        windSpeed: ipmaNumber(values.intensidadeVentoKM),
        precipitation: ipmaNumber(values.precAcumulada),
      };
      const key = Number(id);
      if (!byStation.has(key)) {
        byStation.set(key, []);
      }
      byStation.get(key).push(record);
    }
  }
  for (const records of byStation.values()) {
    records.sort((a, b) => a.time - b.time);
  }
  return byStation;
}

/**
 * The warnings of every area, green ones dropped (they say "no warning").
 * Start and end stay as IPMA writes them (local time, no offset).
 * @returns {Array<{ area: string, phenomenon: string, phenomenonName: string,
 *   level: string, levelValue: number, text: string, start: string, end: string }>}
 */
export function parseWarnings(raw) {
  return expectArray(raw, 'warnings')
    .filter((warning) => warning && LEVELS[warning.awarenessLevelID]?.value > 0)
    .filter(
      (warning) => typeof warning.startTime === 'string' && typeof warning.endTime === 'string',
    )
    .map((warning) => ({
      area: String(warning.idAreaAviso ?? ''),
      phenomenon: phenomenonKey(warning.awarenessTypeName),
      phenomenonName: String(warning.awarenessTypeName ?? ''),
      level: warning.awarenessLevelID,
      levelValue: LEVELS[warning.awarenessLevelID].value,
      text: String(warning.text ?? '').trim(),
      start: warning.startTime,
      end: warning.endTime,
    }));
}

/**
 * Fire risk by municipality code ("0105" → 1 to 5).
 * @returns {{ date: string|null, byDico: Map<string, number> }}
 */
export function parseFireRisk(raw) {
  if (!raw || typeof raw.local !== 'object' || raw.local === null) {
    throw new IpmaError('unexpected fire risk format');
  }
  const byDico = new Map();
  for (const [dico, entry] of Object.entries(raw.local)) {
    const value = ipmaNumber(entry?.data?.rcm);
    if (value !== null && value >= 1 && value <= 5) {
      byDico.set(String(entry?.dico ?? dico), value);
    }
  }
  return { date: typeof raw.dataPrev === 'string' ? raw.dataPrev : null, byDico };
}

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.userAgent]
 */
export function createIpmaClient({
  fetch = globalThis.fetch,
  timeoutMs = 20000,
  userAgent = 'gladys-ipma (+https://github.com/guim31/gladys-ipma)',
} = {}) {
  async function getJson(url) {
    let response;
    try {
      response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': userAgent,
          // pyipma sends it too: the public-data files are those of the site.
          referer: 'https://www.ipma.pt/',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const reason =
        err?.name === 'TimeoutError' ? 'timed out' : (err?.cause?.code ?? err?.message);
      throw new IpmaError(`${new URL(url).pathname}: ${reason}`);
    }
    if (!response.ok) {
      throw new IpmaError(`${new URL(url).pathname}: HTTP ${response.status}`, {
        status: response.status,
      });
    }
    try {
      return await response.json();
    } catch {
      throw new IpmaError(`${new URL(url).pathname}: invalid JSON`);
    }
  }

  return {
    forecast: async (id) => parseForecast(await getJson(ENDPOINTS.forecast(id))),
    stations: async () => parseStations(await getJson(ENDPOINTS.stations)),
    observations: async () => parseObservations(await getJson(ENDPOINTS.observations)),
    warnings: async () => parseWarnings(await getJson(ENDPOINTS.warnings)),
    fireRisk: async () => parseFireRisk(await getJson(ENDPOINTS.fireRisk)),
  };
}
