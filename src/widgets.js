// -----------------------------------------------------------------------------
// The `forecast` dashboard widget: one IPMA location at a glance.
//
//   heading   IPMA · Aveiro
//   caption   Station Aveiro (Universidade) · 23:00
//   tiles     Now (live temperature) · UV index · Fire risk · Warnings
//   card-list the warnings not over yet (active first), tap for IPMA's text
//   status    5 days: weather (with its icon), min / max, chance of rain
//
// Eight components at most, two texts: the core's budget. Everything is
// localized from the `language` of the request (the core caches a content
// per language). The weather is told by the icon of each day; a choice is
// never told by a button style (invisible in dark mode).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { LEVELS, PHENOMENA, uvLevel, weatherType } from './codes.js';
import { fireRiskLabel, locationIds } from './device.js';
import { text } from './i18n.js';
import { hasFireRisk } from './locations.js';
import { localTime } from './time.js';

export const WIDGET_TTL_SECONDS = 600;

const LEVEL_COLORS = {
  green: WIDGET_COLORS.SUCCESS,
  yellow: WIDGET_COLORS.WARNING,
  orange: WIDGET_COLORS.DANGER,
  red: WIDGET_COLORS.DANGER,
};
const UV_COLORS = {
  low: WIDGET_COLORS.SUCCESS,
  moderate: WIDGET_COLORS.WARNING,
  high: WIDGET_COLORS.WARNING,
  very_high: WIDGET_COLORS.DANGER,
  extreme: WIDGET_COLORS.DANGER,
};
const FIRE_COLORS = {
  1: WIDGET_COLORS.SUCCESS,
  2: WIDGET_COLORS.WARNING,
  3: WIDGET_COLORS.WARNING,
  4: WIDGET_COLORS.DANGER,
  5: WIDGET_COLORS.DANGER,
};

const languageOf = (language) => (['en', 'fr', 'de', 'es'].includes(language) ? language : 'en');

/** "Thu 28" in the language of the request, for a calendar date. */
function dayLabel(isoDate, index, language) {
  if (index === 0) {
    return text('today', language);
  }
  if (index === 1) {
    return text('tomorrow', language);
  }
  // Composed here: ICU orders weekday and day differently per language.
  const date = new Date(`${isoDate}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat(language, { timeZone: 'UTC', weekday: 'short' }).format(
    date,
  );
  return `${weekday} ${date.getUTCDate()}`;
}

const degrees = (value) => (value === null ? '–' : `${Math.round(value)}°`);

/** "28/07 09:00" in the local time of the place. */
function dateTime(date, timeZone, language) {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * @param {object} input
 * @param {object} input.gladys GladysIntegration (for the feature external ids)
 * @param {import('./locations.js').Location} input.location
 * @param {object|null} input.snapshot
 * @param {string} input.language
 */
export function buildForecastContent({ gladys, location, snapshot, language: requested }) {
  const language = languageOf(requested);
  const components = [{ type: 'text', variant: 'heading', text: `IPMA · ${location.name}` }];
  // Nothing could be read yet: a sentence, never an empty card.
  const empty =
    !snapshot ||
    (snapshot.days.length === 0 && !snapshot.observation && snapshot.warnings === null);
  if (empty) {
    return { ttl_seconds: 60, components: [...components, unavailableText(language)] };
  }

  const observation = snapshot.observation;
  if (observation) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: `${text('station', language)} ${observation.station.name} · ${localTime(
        observation.time,
        location.timeZone,
      )}`,
    });
  } else if (snapshot.forecastUpdatedAt) {
    components.push({
      type: 'text',
      variant: 'caption',
      text: `${text('updated', language)} ${snapshot.forecastUpdatedAt.slice(11, 16)}`,
    });
  }

  // Tiles: the live temperature follows the published states.
  const ids = locationIds(gladys, location);
  components.push({
    type: 'value',
    label: text('now', language),
    icon: 'thermometer',
    device_feature: ids.feature('temperature'),
  });
  if (snapshot.uv !== null) {
    const uv = Math.round(snapshot.uv);
    components.push({
      type: 'value',
      label: text('uv', language),
      icon: 'sun',
      value: uv,
      color: UV_COLORS[uvLevel(uv).key],
    });
  }
  if (hasFireRisk(location) && snapshot.fireRisk !== null) {
    components.push({
      type: 'value',
      label: text('fire', language),
      icon: 'alert-triangle',
      value: fireRiskLabel(snapshot.fireRisk, language),
      color: FIRE_COLORS[snapshot.fireRisk],
    });
  }
  if (snapshot.warnings !== null) {
    const level = Object.keys(LEVELS).find((key) => LEVELS[key].value === snapshot.warningLevel);
    components.push({
      type: 'value',
      label: text('warning', language),
      icon: snapshot.warningLevel > 0 ? 'alert-octagon' : 'check-circle',
      value: LEVELS[level][language],
      color: LEVEL_COLORS[level],
    });
  }

  // Focal: the warnings, when there are some.
  if (snapshot.warnings && snapshot.warnings.length > 0) {
    components.push({
      type: 'card-list',
      display: 'list',
      items: snapshot.warnings.slice(0, 8).map((warning) => {
        const period = `${dateTime(warning.startsAt, location.timeZone, language)} → ${dateTime(
          warning.endsAt,
          location.timeZone,
          language,
        )}`;
        return {
          title: `${LEVELS[warning.level][language]} · ${PHENOMENA[warning.phenomenon][language]}`,
          subtitle: period,
          badge: {
            text: text(warning.active ? 'ongoing' : 'upcoming', language),
            color: LEVEL_COLORS[warning.level],
          },
          // IPMA writes its warnings in Portuguese.
          ...(warning.text ? { description: `${warning.text}\n\n${period}` } : {}),
        };
      }),
    });
  }

  if (snapshot.days.length > 0) {
    components.push({
      type: 'status',
      items: snapshot.days.map((day, index) => {
        const type = weatherType(day.weatherType);
        const rain = day.rainProbability === null ? '' : ` · ${Math.round(day.rainProbability)} %`;
        return {
          label: `${dayLabel(day.date, index, language)} · ${type[language]}`,
          value: `${degrees(day.min)} / ${degrees(day.max)}${rain}`,
          icon: type.icon,
          color:
            day.rainProbability !== null && day.rainProbability >= 50
              ? WIDGET_COLORS.INFO
              : WIDGET_COLORS.NEUTRAL,
        };
      }),
    });
  }
  return { ttl_seconds: WIDGET_TTL_SECONDS, components };
}

function unavailableText(language) {
  return {
    type: 'text',
    variant: 'body',
    text: {
      en: 'IPMA does not answer for now: the forecast will show up at the next refresh.',
      fr: 'L’IPMA ne répond pas pour l’instant : les prévisions apparaîtront au prochain rafraîchissement.',
      de: 'IPMA antwortet gerade nicht: Die Vorhersage erscheint bei der nächsten Aktualisierung.',
      es: 'El IPMA no responde por ahora: la previsión aparecerá en la próxima actualización.',
    }[language],
  };
}

/** Content of a widget whose integration has no location yet. */
export function notConfiguredContent(language) {
  return {
    ttl_seconds: 60,
    components: [
      { type: 'text', variant: 'heading', text: 'IPMA' },
      {
        type: 'text',
        variant: 'body',
        text: {
          en: 'Choose a location in the configuration of the IPMA integration, then add its device.',
          fr: 'Choisissez un lieu dans la configuration de l’intégration IPMA, puis ajoutez son appareil.',
          de: 'Wähle einen Ort in der Konfiguration der IPMA-Integration und füge dann sein Gerät hinzu.',
          es: 'Elija un lugar en la configuración de la integración IPMA y luego añada su dispositivo.',
        }[languageOf(language)],
      },
    ],
  };
}
