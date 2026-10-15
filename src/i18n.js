// -----------------------------------------------------------------------------
// Texts produced by the container, in the four languages of the Gladys
// interface. German says "du", Spanish "usted" (the series' convention).
//
// NAMES: feature names, in the language of the configuration (Gladys keeps
// the name a feature had when the device was added).
// TEXT: short texts of the widget and of the features.
// MESSAGES: connection status and action results, as multi-language objects
// (Gladys shows the language of the user who reads them).
// -----------------------------------------------------------------------------

import { LANGUAGES } from './config.js';

export const NAMES = {
  en: {
    temperature: 'Temperature (station)',
    humidity: 'Humidity (station)',
    pressure: 'Pressure (station)',
    wind_speed: 'Wind (station)',
    precipitation: 'Rain last hour (station)',
    today_min: 'Min today',
    today_max: 'Max today',
    tomorrow_min: 'Min tomorrow',
    tomorrow_max: 'Max tomorrow',
    today_rain_probability: 'Chance of rain today',
    tomorrow_rain_probability: 'Chance of rain tomorrow',
    today_weather: 'Weather today',
    tomorrow_weather: 'Weather tomorrow',
    today_wind: 'Wind today',
    uv_index: 'UV index',
    fire_risk: 'Fire risk (1-5)',
    warning_level: 'Warning level',
    warnings: 'Weather warnings',
  },
  fr: {
    temperature: 'Température (station)',
    humidity: 'Humidité (station)',
    pressure: 'Pression (station)',
    wind_speed: 'Vent (station)',
    precipitation: 'Pluie dernière heure (station)',
    today_min: 'Min aujourd’hui',
    today_max: 'Max aujourd’hui',
    tomorrow_min: 'Min demain',
    tomorrow_max: 'Max demain',
    today_rain_probability: 'Probabilité de pluie aujourd’hui',
    tomorrow_rain_probability: 'Probabilité de pluie demain',
    today_weather: 'Temps aujourd’hui',
    tomorrow_weather: 'Temps demain',
    today_wind: 'Vent aujourd’hui',
    uv_index: 'Indice UV',
    fire_risk: 'Risque d’incendie (1-5)',
    warning_level: 'Niveau d’avertissement',
    warnings: 'Avertissements météo',
  },
  de: {
    temperature: 'Temperatur (Station)',
    humidity: 'Luftfeuchtigkeit (Station)',
    pressure: 'Luftdruck (Station)',
    wind_speed: 'Wind (Station)',
    precipitation: 'Regen letzte Stunde (Station)',
    today_min: 'Min heute',
    today_max: 'Max heute',
    tomorrow_min: 'Min morgen',
    tomorrow_max: 'Max morgen',
    today_rain_probability: 'Regenwahrscheinlichkeit heute',
    tomorrow_rain_probability: 'Regenwahrscheinlichkeit morgen',
    today_weather: 'Wetter heute',
    tomorrow_weather: 'Wetter morgen',
    today_wind: 'Wind heute',
    uv_index: 'UV-Index',
    fire_risk: 'Waldbrandgefahr (1-5)',
    warning_level: 'Warnstufe',
    warnings: 'Wetterwarnungen',
  },
  es: {
    temperature: 'Temperatura (estación)',
    humidity: 'Humedad (estación)',
    pressure: 'Presión (estación)',
    wind_speed: 'Viento (estación)',
    precipitation: 'Lluvia última hora (estación)',
    today_min: 'Mín. hoy',
    today_max: 'Máx. hoy',
    tomorrow_min: 'Mín. mañana',
    tomorrow_max: 'Máx. mañana',
    today_rain_probability: 'Probabilidad de lluvia hoy',
    tomorrow_rain_probability: 'Probabilidad de lluvia mañana',
    today_weather: 'Tiempo hoy',
    tomorrow_weather: 'Tiempo mañana',
    today_wind: 'Viento hoy',
    uv_index: 'Índice UV',
    fire_risk: 'Riesgo de incendio (1-5)',
    warning_level: 'Nivel de aviso',
    warnings: 'Avisos meteorológicos',
  },
};

// Short texts, one object per key (each ≤ 24 characters: tile labels).
export const TEXT = {
  now: { en: 'Now', fr: 'Maintenant', de: 'Jetzt', es: 'Ahora' },
  uv: { en: 'UV index', fr: 'Indice UV', de: 'UV-Index', es: 'Índice UV' },
  fire: {
    en: 'Fire risk',
    fr: 'Risque d’incendie',
    de: 'Waldbrandgefahr',
    es: 'Riesgo de incendio',
  },
  warning: { en: 'Warnings', fr: 'Avertissements', de: 'Warnungen', es: 'Avisos' },
  today: { en: 'Today', fr: 'Aujourd’hui', de: 'Heute', es: 'Hoy' },
  tomorrow: { en: 'Tomorrow', fr: 'Demain', de: 'Morgen', es: 'Mañana' },
  station: { en: 'Station', fr: 'Station', de: 'Station', es: 'Estación' },
  updated: { en: 'Forecast of', fr: 'Prévision de', de: 'Vorhersage von', es: 'Previsión de' },
  ongoing: { en: 'Ongoing', fr: 'En cours', de: 'Aktiv', es: 'En curso' },
  upcoming: { en: 'Upcoming', fr: 'À venir', de: 'Bevorstehend', es: 'Próximo' },
  noWarning: { en: 'No warning', fr: 'Aucun avertissement', de: 'Keine Warnung', es: 'Sin avisos' },
  noWarningNow: {
    en: 'No warning now',
    fr: 'Aucun en cours',
    de: 'Derzeit keine',
    es: 'Ninguno ahora',
  },
  next: { en: 'next', fr: 'à venir', de: 'demnächst', es: 'próximo' },
  until: { en: 'until', fr: 'jusqu’à', de: 'bis', es: 'hasta' },
};

/** A multi-language object built by a function of the language. */
const all = (build) => Object.fromEntries(LANGUAGES.map((lang) => [lang, build(lang)]));

export const MESSAGES = {
  notConfigured: {
    en: 'Choose a location in the configuration.',
    fr: 'Choisissez un lieu dans la configuration.',
    de: 'Wähle einen Ort in der Konfiguration.',
    es: 'Elija un lugar en la configuración.',
  },
  unreachable: (reason) => ({
    en: `IPMA does not answer (${reason}).`,
    fr: `L’IPMA ne répond pas (${reason}).`,
    de: `IPMA antwortet nicht (${reason}).`,
    es: `El IPMA no responde (${reason}).`,
  }),
  initFailed: {
    en: 'Initialization failed, check the integration logs.',
    fr: 'L’initialisation a échoué, consultez les journaux de l’intégration.',
    de: 'Die Initialisierung ist fehlgeschlagen, sieh in den Logs der Integration nach.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  unknownLocations: (names) => ({
    en: `Unknown locations ignored: ${names}.`,
    fr: `Lieux inconnus ignorés : ${names}.`,
    de: `Unbekannte Orte ignoriert: ${names}.`,
    es: `Lugares desconocidos ignorados: ${names}.`,
  }),
  houseNotFound: {
    en: 'This house no longer exists in Gladys.',
    fr: 'Cette maison n’existe plus dans Gladys.',
    de: 'Dieses Haus gibt es in Gladys nicht mehr.',
    es: 'Esta casa ya no existe en Gladys.',
  },
  houseNotLocated: (house) => ({
    en: `The house "${house}" has no position: set it in Settings → Houses.`,
    fr: `La maison « ${house} » n’a pas de position : renseignez-la dans Paramètres → Maisons.`,
    de: `Das Haus „${house}“ hat keine Position: Lege sie unter Einstellungen → Häuser fest.`,
    es: `La casa «${house}» no tiene posición: indíquela en Ajustes → Casas.`,
  }),
  houseTooFar: (house, km) => ({
    en: `"${house}" is ${km} km from the nearest IPMA location: IPMA only covers Portugal. Pick a location in the list instead.`,
    fr: `« ${house} » est à ${km} km du lieu IPMA le plus proche : l’IPMA ne couvre que le Portugal. Choisissez plutôt un lieu dans la liste.`,
    de: `„${house}“ ist ${km} km vom nächsten IPMA-Ort entfernt: IPMA deckt nur Portugal ab. Wähle stattdessen einen Ort aus der Liste.`,
    es: `«${house}» está a ${km} km del lugar IPMA más cercano: el IPMA solo cubre Portugal. Elija mejor un lugar de la lista.`,
  }),
  locationSet: (label, house, km) => ({
    en: `Location set: ${label}, ${km} km from "${house}". Reload the page to see it in the form.`,
    fr: `Lieu choisi : ${label}, à ${km} km de « ${house} ». Rechargez la page pour le voir dans le formulaire.`,
    de: `Ort gewählt: ${label}, ${km} km von „${house}“ entfernt. Lade die Seite neu, um ihn im Formular zu sehen.`,
    es: `Lugar elegido: ${label}, a ${km} km de «${house}». Recargue la página para verlo en el formulario.`,
  }),
  checkResult: (lines) => all((lang) => lines.map((line) => line[lang]).join(' ')),
  checkLocation: ({ name, temperature, station, min, max, warnings }) =>
    all((lang) => {
      // French puts a space before the colon.
      const parts = [lang === 'fr' ? `${name} :` : `${name}:`];
      if (temperature !== null) {
        parts.push(
          {
            en: `${temperature} °C at ${station},`,
            fr: `${temperature} °C à ${station},`,
            de: `${temperature} °C in ${station},`,
            es: `${temperature} °C en ${station},`,
          }[lang],
        );
      } else {
        parts.push(
          {
            en: 'no station nearby,',
            fr: 'pas de station proche,',
            de: 'keine Station in der Nähe,',
            es: 'ninguna estación cercana,',
          }[lang],
        );
      }
      if (min !== null && max !== null) {
        parts.push(
          {
            en: `${min} to ${max} °C today,`,
            fr: `${min} à ${max} °C aujourd’hui,`,
            de: `heute ${min} bis ${max} °C,`,
            es: `de ${min} a ${max} °C hoy,`,
          }[lang],
        );
      }
      parts.push(
        warnings === null
          ? {
              en: 'warnings unavailable.',
              fr: 'avertissements indisponibles.',
              de: 'Warnungen nicht verfügbar.',
              es: 'avisos no disponibles.',
            }[lang]
          : {
              en: `${warnings} warning(s).`,
              fr: `${warnings} avertissement(s).`,
              de: `${warnings} Warnung(en).`,
              es: `${warnings} aviso(s).`,
            }[lang],
      );
      return parts.join(' ');
    }),
  checkFailed: (reason) => ({
    en: `IPMA does not answer: ${reason}`,
    fr: `L’IPMA ne répond pas : ${reason}`,
    de: `IPMA antwortet nicht: ${reason}`,
    es: `El IPMA no responde: ${reason}`,
  }),
};

/** A text of TEXT in a language (English for an unknown one). */
export function text(key, language) {
  return TEXT[key][language] ?? TEXT[key].en;
}
