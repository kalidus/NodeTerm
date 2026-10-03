'use strict';

const MOON_KEYS = [
  'moon-new',
  'moon-waxing-crescent',
  'moon-first-quarter',
  'moon-waxing-gibbous',
  'moon-full',
  'moon-waning-gibbous',
  'moon-last-quarter',
  'moon-waning-crescent'
];

function isDaylight(isDay) {
  return isDay !== false && isDay !== 0;
}

function weatherMeteoconKey(code, isDay) {
  const day = isDaylight(isDay);
  const c = Number(code);

  switch (c) {
    case 0:
      return day ? 'clear-day' : 'clear-night';
    case 1:
    case 2:
      return day ? 'partly-cloudy-day' : 'partly-cloudy-night';
    case 3:
      return day ? 'overcast-day' : 'overcast-night';
    case 45:
    case 48:
      return day ? 'fog-day' : 'fog-night';
    case 51:
    case 53:
    case 55:
      return 'drizzle';
    case 56:
    case 57:
      return 'sleet';
    case 61:
    case 63:
      return 'rain';
    case 65:
      return 'overcast-rain';
    case 66:
    case 67:
      return 'sleet';
    case 71:
    case 73:
      return 'snow';
    case 75:
      return 'overcast-snow';
    case 77:
      return 'snow';
    case 80:
    case 81:
    case 82:
      return 'overcast-rain';
    case 85:
    case 86:
      return 'overcast-snow';
    case 95:
      return day ? 'thunderstorms-day' : 'thunderstorms-night';
    case 96:
      return day ? 'thunderstorms-day-rain' : 'thunderstorms-night-rain';
    case 99:
      return 'hail';
    default:
      return 'cloudy';
  }
}

function weatherVisualKind(code) {
  const c = Number(code);
  if (c === 0 || c === 1) return 'clear';
  if (c >= 45 && c <= 48) return 'fog';
  if (c >= 95) return 'storm';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'snow';
  return 'cloud';
}

function moonMeteoconKey(phaseIndex) {
  const idx = Number(phaseIndex);
  if (!Number.isFinite(idx)) return 'moon-new';
  const clamped = Math.max(0, Math.min(7, Math.floor(idx)));
  return MOON_KEYS[clamped];
}

module.exports = {
  weatherMeteoconKey,
  weatherVisualKind,
  moonMeteoconKey
};
