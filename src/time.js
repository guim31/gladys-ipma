// -----------------------------------------------------------------------------
// Local times of Portugal.
//
// IPMA writes its forecast dates and warning periods without an offset, in
// the local time of the place ("2022-07-28T09:00:00"): mainland and Madeira
// (WET/WEST) or the Azores, one hour behind. These helpers turn them into
// instants, and an instant into the local calendar date of a place.
// -----------------------------------------------------------------------------

const formatters = new Map();

function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(
      timeZone,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );
  }
  return formatters.get(timeZone);
}

/** The wall-clock fields of an instant in a time zone. */
function wallClock(date, timeZone) {
  const fields = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    fields[part.type] = Number(part.value);
  }
  return fields;
}

/** Offset of a time zone at an instant, in milliseconds (UTC+1 → 3600000). */
function offsetMs(date, timeZone) {
  const f = wallClock(date, timeZone);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * "2022-07-28T09:00:00" in a time zone → the instant. Null when unparseable.
 * @returns {Date|null}
 */
export function localToDate(text, timeZone) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(
    String(text ?? ''),
  );
  if (!match) {
    return null;
  }
  const [, year, month, day, hour = 0, minute = 0, second = 0] = match.map((value) =>
    value === undefined ? undefined : Number(value),
  );
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const first = offsetMs(new Date(guess), timeZone);
  let instant = guess - first;
  // Around a DST change, the offset at the result may differ from the guess.
  const second2 = offsetMs(new Date(instant), timeZone);
  if (second2 !== first) {
    instant = guess - second2;
  }
  return new Date(instant);
}

/** Local calendar date of an instant in a time zone: "2022-07-28". */
export function localDate(date, timeZone) {
  const f = wallClock(date, timeZone);
  return `${f.year}-${String(f.month).padStart(2, '0')}-${String(f.day).padStart(2, '0')}`;
}

/** Local time of an instant in a time zone: "09:05". */
export function localTime(date, timeZone) {
  const f = wallClock(date, timeZone);
  return `${String(f.hour).padStart(2, '0')}:${String(f.minute).padStart(2, '0')}`;
}

/** The calendar date following "2022-07-28". */
export function nextDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/**
 * "Fri 07:00", "ven. 07:00" — an instant in the local time of a place. The
 * weekday comes from Intl, the time is appended here: how ICU joins them
 * varies between languages and Node versions.
 */
export function weekdayTime(date, timeZone, language) {
  const weekday = new Intl.DateTimeFormat(language, { timeZone, weekday: 'short' }).format(date);
  return `${weekday} ${localTime(date, timeZone)}`;
}
