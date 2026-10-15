// -----------------------------------------------------------------------------
// IPMA codes and their translations.
//
// IPMA describes its data in Portuguese (and partly in English): weather type
// ids, warning phenomena ("Agitação Marítima"), colour levels, wind classes,
// fire risk classes. Gladys shows them in the language chosen in the
// configuration (feature texts, scene variables) or in the user's language
// (widget), so every code is translated here, in the four languages of the
// Gladys interface.
// -----------------------------------------------------------------------------

/**
 * IPMA weather types (`idTipoTempo`, list: open-data/weather-type-classe.json),
 * with the Feather icon the widget shows next to them.
 */
export const WEATHER_TYPES = {
  0: {
    icon: 'help-circle',
    en: 'No information',
    fr: 'Pas d’information',
    de: 'Keine Angabe',
    es: 'Sin información',
  },
  1: {
    icon: 'sun',
    en: 'Clear sky',
    fr: 'Ciel dégagé',
    de: 'Klarer Himmel',
    es: 'Cielo despejado',
  },
  2: {
    icon: 'sun',
    en: 'Partly cloudy',
    fr: 'Peu nuageux',
    de: 'Leicht bewölkt',
    es: 'Poco nuboso',
  },
  3: {
    icon: 'cloud',
    en: 'Sunny intervals',
    fr: 'Éclaircies',
    de: 'Heiter bis wolkig',
    es: 'Intervalos nubosos',
  },
  4: {
    icon: 'cloud',
    en: 'Very cloudy or overcast',
    fr: 'Très nuageux ou couvert',
    de: 'Stark bewölkt oder bedeckt',
    es: 'Muy nuboso o cubierto',
  },
  5: {
    icon: 'cloud',
    en: 'High clouds',
    fr: 'Nuages élevés',
    de: 'Hohe Bewölkung',
    es: 'Nubes altas',
  },
  6: {
    icon: 'cloud-rain',
    en: 'Showers or rain',
    fr: 'Averses ou pluie',
    de: 'Schauer oder Regen',
    es: 'Chubascos o lluvia',
  },
  7: {
    icon: 'cloud-drizzle',
    en: 'Light showers or rain',
    fr: 'Averses ou pluie faibles',
    de: 'Leichte Schauer oder Regen',
    es: 'Chubascos o lluvia débiles',
  },
  8: {
    icon: 'cloud-rain',
    en: 'Heavy showers or rain',
    fr: 'Fortes averses ou pluie',
    de: 'Starke Schauer oder Regen',
    es: 'Chubascos o lluvia fuertes',
  },
  9: {
    icon: 'cloud-rain',
    en: 'Rain or showers',
    fr: 'Pluie ou averses',
    de: 'Regen oder Schauer',
    es: 'Lluvia o chubascos',
  },
  10: {
    icon: 'cloud-drizzle',
    en: 'Light rain or drizzle',
    fr: 'Pluie faible ou bruine',
    de: 'Leichter Regen oder Niesel',
    es: 'Lluvia débil o llovizna',
  },
  11: {
    icon: 'cloud-rain',
    en: 'Heavy rain or showers',
    fr: 'Forte pluie ou averses',
    de: 'Starkregen oder Schauer',
    es: 'Lluvia fuerte o chubascos',
  },
  12: {
    icon: 'cloud-rain',
    en: 'Intermittent rain',
    fr: 'Pluie intermittente',
    de: 'Zeitweise Regen',
    es: 'Lluvia intermitente',
  },
  13: {
    icon: 'cloud-drizzle',
    en: 'Intermittent light rain',
    fr: 'Pluie faible intermittente',
    de: 'Zeitweise leichter Regen',
    es: 'Lluvia débil intermitente',
  },
  14: {
    icon: 'cloud-rain',
    en: 'Intermittent heavy rain',
    fr: 'Forte pluie intermittente',
    de: 'Zeitweise starker Regen',
    es: 'Lluvia fuerte intermitente',
  },
  15: { icon: 'cloud-drizzle', en: 'Drizzle', fr: 'Bruine', de: 'Nieselregen', es: 'Llovizna' },
  16: { icon: 'cloud', en: 'Mist', fr: 'Brume', de: 'Dunst', es: 'Neblina' },
  17: {
    icon: 'cloud',
    en: 'Fog or low clouds',
    fr: 'Brouillard ou nuages bas',
    de: 'Nebel oder tiefe Wolken',
    es: 'Niebla o nubes bajas',
  },
  18: { icon: 'cloud-snow', en: 'Snow', fr: 'Neige', de: 'Schnee', es: 'Nieve' },
  19: {
    icon: 'cloud-lightning',
    en: 'Thunderstorms',
    fr: 'Orages',
    de: 'Gewitter',
    es: 'Tormentas',
  },
  20: {
    icon: 'cloud-lightning',
    en: 'Showers, possible storms',
    fr: 'Averses, orages possibles',
    de: 'Schauer, Gewitter möglich',
    es: 'Chubascos, posibles tormentas',
  },
  21: { icon: 'cloud-snow', en: 'Hail', fr: 'Grêle', de: 'Hagel', es: 'Granizo' },
  22: { icon: 'thermometer', en: 'Frost', fr: 'Gelée', de: 'Frost', es: 'Helada' },
  23: {
    icon: 'cloud-lightning',
    en: 'Rain, possible storms',
    fr: 'Pluie, orages possibles',
    de: 'Regen, Gewitter möglich',
    es: 'Lluvia, posibles tormentas',
  },
  24: {
    icon: 'cloud',
    en: 'Convective clouds',
    fr: 'Nuages convectifs',
    de: 'Quellbewölkung',
    es: 'Nubosidad convectiva',
  },
  25: {
    icon: 'cloud',
    en: 'Very cloudy at times',
    fr: 'Passages très nuageux',
    de: 'Zeitweise stark bewölkt',
    es: 'Intervalos muy nubosos',
  },
  26: { icon: 'cloud', en: 'Fog', fr: 'Brouillard', de: 'Nebel', es: 'Niebla' },
  27: { icon: 'cloud', en: 'Cloudy', fr: 'Nuageux', de: 'Bewölkt', es: 'Nuboso' },
  28: {
    icon: 'cloud-snow',
    en: 'Snow showers',
    fr: 'Averses de neige',
    de: 'Schneeschauer',
    es: 'Chubascos de nieve',
  },
  29: {
    icon: 'cloud-snow',
    en: 'Rain and snow',
    fr: 'Pluie et neige',
    de: 'Regen und Schnee',
    es: 'Lluvia y nieve',
  },
  30: {
    icon: 'cloud-snow',
    en: 'Rain and snow',
    fr: 'Pluie et neige',
    de: 'Regen und Schnee',
    es: 'Lluvia y nieve',
  },
};

/** A weather type, "No information" for -99 and the codes IPMA may add later. */
export function weatherType(id) {
  return WEATHER_TYPES[id] ?? WEATHER_TYPES[0];
}

/**
 * Warning phenomena (`awarenessTypeName`, Portuguese in warnings_www.json).
 * The keys are the values of the `phenomenon` filter and variable of the
 * `warning_issued` scene trigger: they never change.
 */
export const PHENOMENA = {
  rain: { pt: 'Precipitação', en: 'Rain', fr: 'Pluie', de: 'Regen', es: 'Lluvia' },
  snow: { pt: 'Neve', en: 'Snow', fr: 'Neige', de: 'Schnee', es: 'Nieve' },
  thunderstorm: {
    pt: 'Trovoada',
    en: 'Thunderstorms',
    fr: 'Orages',
    de: 'Gewitter',
    es: 'Tormentas',
  },
  fog: { pt: 'Nevoeiro', en: 'Fog', fr: 'Brouillard', de: 'Nebel', es: 'Niebla' },
  cold: { pt: 'Tempo Frio', en: 'Cold weather', fr: 'Grand froid', de: 'Kälte', es: 'Frío' },
  heat: { pt: 'Tempo Quente', en: 'Hot weather', fr: 'Fortes chaleurs', de: 'Hitze', es: 'Calor' },
  coastal: {
    pt: 'Agitação Marítima',
    en: 'Rough sea',
    fr: 'Mer agitée',
    de: 'Hoher Seegang',
    es: 'Mar agitado',
  },
  wind: { pt: 'Vento', en: 'Wind', fr: 'Vent', de: 'Wind', es: 'Viento' },
  other: { pt: '', en: 'Other', fr: 'Autre', de: 'Sonstiges', es: 'Otro' },
};

const fold = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const PHENOMENON_BY_NAME = new Map(
  Object.entries(PHENOMENA)
    .filter(([, value]) => value.pt)
    .map(([key, value]) => [fold(value.pt), key]),
);

/** Key of an IPMA phenomenon name, `other` for a name IPMA adds later. */
export function phenomenonKey(name) {
  return PHENOMENON_BY_NAME.get(fold(name)) ?? 'other';
}

/**
 * Warning levels (`awarenessLevelID`). The number is the value of the
 * `warning_level` feature: Gladys draws a `risk` feature 0 to 3 as a green,
 * yellow, orange and red badge — IPMA's own colour scale.
 */
export const LEVELS = {
  green: { value: 0, en: 'None', fr: 'Aucun', de: 'Keine', es: 'Ninguno' },
  yellow: { value: 1, en: 'Yellow', fr: 'Jaune', de: 'Gelb', es: 'Amarillo' },
  orange: { value: 2, en: 'Orange', fr: 'Orange', de: 'Orange', es: 'Naranja' },
  red: { value: 3, en: 'Red', fr: 'Rouge', de: 'Rot', es: 'Rojo' },
};

/** Daily wind class (`idFfxVento`). */
export const WIND_CLASSES = {
  1: { en: 'Weak', fr: 'Faible', de: 'Schwach', es: 'Débil' },
  2: { en: 'Moderate', fr: 'Modéré', de: 'Mäßig', es: 'Moderado' },
  3: { en: 'Strong', fr: 'Fort', de: 'Stark', es: 'Fuerte' },
  4: { en: 'Very strong', fr: 'Très fort', de: 'Sehr stark', es: 'Muy fuerte' },
};

// Compass points as IPMA writes them (English letters), per language.
const DIRECTIONS = {
  en: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SW', W: 'W', NW: 'NW' },
  fr: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO' },
  de: { N: 'N', NE: 'NO', E: 'O', SE: 'SO', S: 'S', SW: 'SW', W: 'W', NW: 'NW' },
  es: { N: 'N', NE: 'NE', E: 'E', SE: 'SE', S: 'S', SW: 'SO', W: 'O', NW: 'NO' },
};

/** "Moderate, NW" — or null when IPMA gives neither. */
export function windText(windClass, direction, language) {
  const parts = [];
  const known = WIND_CLASSES[windClass];
  if (known) {
    parts.push(known[language]);
  }
  const point = String(direction ?? '').toUpperCase();
  if (DIRECTIONS.en[point]) {
    parts.push(DIRECTIONS[language][point]);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Fire risk classes of the RCM files (1 to 5). */
export const FIRE_RISKS = {
  1: { en: 'Low', fr: 'Réduit', de: 'Gering', es: 'Bajo' },
  2: { en: 'Moderate', fr: 'Modéré', de: 'Mäßig', es: 'Moderado' },
  3: { en: 'High', fr: 'Élevé', de: 'Hoch', es: 'Alto' },
  4: { en: 'Very high', fr: 'Très élevé', de: 'Sehr hoch', es: 'Muy alto' },
  5: { en: 'Maximum', fr: 'Maximum', de: 'Maximal', es: 'Máximo' },
};

/** UV index scale (WHO), as IPMA publishes it. */
export function uvLevel(index) {
  if (index <= 2) {
    return { key: 'low', en: 'Low', fr: 'Faible', de: 'Niedrig', es: 'Bajo' };
  }
  if (index <= 5) {
    return { key: 'moderate', en: 'Moderate', fr: 'Modéré', de: 'Mäßig', es: 'Moderado' };
  }
  if (index <= 7) {
    return { key: 'high', en: 'High', fr: 'Élevé', de: 'Hoch', es: 'Alto' };
  }
  if (index <= 10) {
    return { key: 'very_high', en: 'Very high', fr: 'Très élevé', de: 'Sehr hoch', es: 'Muy alto' };
  }
  return { key: 'extreme', en: 'Extreme', fr: 'Extrême', de: 'Extrem', es: 'Extremo' };
}
