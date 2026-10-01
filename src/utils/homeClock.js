'use strict';

const CLOCK_CONFIG_KEY = 'nodeterm_home_clock_config';
const WEATHER_CACHE_KEY = 'nodeterm_home_clock_weather_cache';

const BOOLEAN_KEYS = [
  'showTime',
  'showSeconds',
  'hour12',
  'showLongDate',
  'showGreeting',
  'showTimezone',
  'showWeekday',
  'showIsoWeek',
  'showDayOfYear',
  'showCity',
  'showCondition',
  'showTemperature',
  'showFeelsLike',
  'showMinMax',
  'showHumidity',
  'showWind',
  'showPressure',
  'showUv',
  'showVisibility',
  'showPrecip',
  'showSun',
  'showMoon',
  'showHourly',
  'showDaily',
  'showUpdated',
  'useIpLocation'
];

const DEFAULT_CLOCK_CONFIG = {
  showTime: true,
  showSeconds: true,
  hour12: false,
  showLongDate: true,
  showGreeting: true,
  showTimezone: false,
  showWeekday: false,
  showIsoWeek: false,
  showDayOfYear: false,
  extraTimezones: [],
  showCity: true,
  showCondition: true,
  showTemperature: true,
  showFeelsLike: false,
  showMinMax: false,
  showHumidity: false,
  showWind: false,
  showPressure: false,
  showUv: false,
  showVisibility: false,
  showPrecip: false,
  showSun: false,
  showMoon: false,
  showHourly: false,
  showDaily: true,
  showUpdated: true,
  dailyDays: 3,
  city: '',
  useIpLocation: false,
  tempUnit: 'c',
  windUnit: 'kmh',
  refreshMinutes: 30
};

const WMO_CODES = {
  0: { label: 'Despejado', icon: 'pi pi-sun' },
  1: { label: 'Mayormente despejado', icon: 'pi pi-sun' },
  2: { label: 'Parcialmente nublado', icon: 'pi pi-cloud' },
  3: { label: 'Nublado', icon: 'pi pi-cloud' },
  45: { label: 'Niebla', icon: 'pi pi-cloud' },
  48: { label: 'Niebla helada', icon: 'pi pi-cloud' },
  51: { label: 'Llovizna debil', icon: 'pi pi-cloud' },
  53: { label: 'Llovizna', icon: 'pi pi-cloud' },
  55: { label: 'Llovizna fuerte', icon: 'pi pi-cloud' },
  56: { label: 'Llovizna helada', icon: 'pi pi-cloud' },
  57: { label: 'Llovizna helada fuerte', icon: 'pi pi-cloud' },
  61: { label: 'Lluvia debil', icon: 'pi pi-cloud' },
  63: { label: 'Lluvia', icon: 'pi pi-cloud' },
  65: { label: 'Lluvia fuerte', icon: 'pi pi-cloud' },
  66: { label: 'Lluvia helada', icon: 'pi pi-cloud' },
  67: { label: 'Lluvia helada fuerte', icon: 'pi pi-cloud' },
  71: { label: 'Nieve debil', icon: 'pi pi-cloud' },
  73: { label: 'Nieve', icon: 'pi pi-cloud' },
  75: { label: 'Nieve fuerte', icon: 'pi pi-cloud' },
  77: { label: 'Granizo fino', icon: 'pi pi-cloud' },
  80: { label: 'Chubascos', icon: 'pi pi-cloud' },
  81: { label: 'Chubascos moderados', icon: 'pi pi-cloud' },
  82: { label: 'Chubascos fuertes', icon: 'pi pi-cloud' },
  85: { label: 'Chubascos de nieve', icon: 'pi pi-cloud' },
  86: { label: 'Chubascos de nieve fuertes', icon: 'pi pi-cloud' },
  95: { label: 'Tormenta', icon: 'pi pi-bolt' },
  96: { label: 'Tormenta con granizo', icon: 'pi pi-bolt' },
  99: { label: 'Tormenta fuerte con granizo', icon: 'pi pi-bolt' }
};

const MOON_PHASES = [
  { name: 'Luna nueva', icon: 'pi pi-circle' },
  { name: 'Creciente', icon: 'pi pi-circle' },
  { name: 'Cuarto creciente', icon: 'pi pi-circle' },
  { name: 'Gibosa creciente', icon: 'pi pi-circle-fill' },
  { name: 'Luna llena', icon: 'pi pi-circle-fill' },
  { name: 'Gibosa menguante', icon: 'pi pi-circle-fill' },
  { name: 'Cuarto menguante', icon: 'pi pi-circle' },
  { name: 'Menguante', icon: 'pi pi-circle' }
];

const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

function defaultStorage() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function isValidTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat('es-ES', { timeZone }).format(new Date());
    return true;
  } catch (err) {
    return false;
  }
}

function parseTimezoneList(text) {
  const raw = String(text || '').split(/[,;\n]/);
  const seen = new Set();
  const out = [];
  raw.forEach((part) => {
    const zone = part.trim();
    if (!zone || seen.has(zone) || !isValidTimeZone(zone)) return;
    seen.add(zone);
    out.push(zone);
  });
  return out.slice(0, 6);
}

function normalizeClockConfig(input) {
  const src = input && typeof input === 'object' ? input : {};
  const next = {};
  BOOLEAN_KEYS.forEach((key) => {
    next[key] = typeof src[key] === 'boolean' ? src[key] : DEFAULT_CLOCK_CONFIG[key];
  });

  const days = Number(src.dailyDays);
  next.dailyDays = days === 5 || days === 7 ? days : 3;

  const refresh = Number(src.refreshMinutes);
  next.refreshMinutes = refresh === 15 || refresh === 60 ? refresh : 30;

  next.tempUnit = src.tempUnit === 'f' ? 'f' : 'c';
  next.windUnit = src.windUnit === 'ms' ? 'ms' : 'kmh';
  next.city = typeof src.city === 'string' ? src.city.trim().slice(0, 80) : '';

  const zones = Array.isArray(src.extraTimezones) ? src.extraTimezones : [];
  next.extraTimezones = parseTimezoneList(zones.join(','));
  return next;
}

function loadClockConfig(storage) {
  const store = storage || defaultStorage();
  if (!store) return normalizeClockConfig(null);
  try {
    const raw = store.getItem(CLOCK_CONFIG_KEY);
    if (!raw) return normalizeClockConfig(null);
    return normalizeClockConfig(JSON.parse(raw));
  } catch (err) {
    return normalizeClockConfig(null);
  }
}

function saveClockConfig(config, storage) {
  const store = storage || defaultStorage();
  const next = normalizeClockConfig(config);
  if (!store) return next;
  try {
    store.setItem(CLOCK_CONFIG_KEY, JSON.stringify(next));
  } catch (err) {
    // localStorage lleno o bloqueado: la sesion sigue con el estado en memoria
  }
  return next;
}

function weatherCodeInfo(code, isDay) {
  const info = WMO_CODES[Number(code)] || { label: 'Sin datos', icon: 'pi pi-cloud' };
  if ((Number(code) === 0 || Number(code) === 1) && isDay === false) {
    return { label: info.label, icon: 'pi pi-moon' };
  }
  return info;
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function dayOfYear(date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const start = Date.UTC(date.getFullYear(), 0, 1);
  return Math.floor((utc - start) / 86400000) + 1;
}

function daysInYear(date) {
  const year = date.getFullYear();
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) return 366;
  return 365;
}

function julianDay(date) {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  if (month < 3) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function moonPhase(date) {
  const synodic = 29.530588853;
  let age = (julianDay(date) - 2451550.1) / synodic;
  age -= Math.floor(age);
  if (age < 0) age += 1;
  const index = Math.round(age * 8) % 8;
  return { ...MOON_PHASES[index], age, index };
}

function greetingForHour(hour) {
  const h = Number(hour);
  if (h >= 5 && h < 12) return 'Buenos dias';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function windDirectionLabel(degrees) {
  const value = Number(degrees);
  if (!Number.isFinite(value)) return '';
  const index = Math.round(value / 45) % 8;
  return WIND_DIRS[(index + 8) % 8];
}

function formatUpdatedAgo(iso, now) {
  const current = now instanceof Date ? now : new Date();
  const then = new Date(iso).getTime();
  if (!iso || Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.floor((current.getTime() - then) / 60000));
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function formatClockTime(date, options) {
  const opts = options || {};
  const format = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !!opts.hour12
  };
  if (opts.showSeconds) format.second = '2-digit';
  if (opts.timeZone) format.timeZone = opts.timeZone;
  return new Intl.DateTimeFormat('es-ES', format).format(date);
}

function formatLongDate(date, timeZone) {
  const format = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  if (timeZone) format.timeZone = timeZone;
  const text = new Intl.DateTimeFormat('es-ES', format).format(date);
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatWeekday(date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
}

function formatUtcOffset(date, timeZone) {
  const zone = timeZone || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(date);
    const map = {};
    parts.forEach((part) => {
      if (part.type !== 'literal') map[part.type] = part.value;
    });
    const asUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );
    const diffMin = Math.round((asUtc - date.getTime()) / 60000);
    const sign = diffMin >= 0 ? '+' : '-';
    const abs = Math.abs(diffMin);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;
    if (minutes === 0) return `UTC${sign}${hours}`;
    return `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
  } catch (err) {
    return '';
  }
}

function timezoneLabel(date, timeZone) {
  const id = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return { id, offset: formatUtcOffset(date, id) };
}

function zoneShortName(timeZone) {
  const parts = String(timeZone || '').split('/');
  return (parts[parts.length - 1] || timeZone).replace(/_/g, ' ');
}

function roundMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function tempSuffix(unit) {
  return unit === 'f' ? 'F' : 'C';
}

function windSuffix(unit) {
  return unit === 'ms' ? 'm/s' : 'km/h';
}

function clockFromIso(iso) {
  const match = String(iso || '').match(/T(\d{2}:\d{2})/);
  return match ? match[1] : '';
}

function hourLabel(iso) {
  const match = String(iso || '').match(/T(\d{2}):/);
  return match ? `${match[1]}h` : '';
}

function weekdayShortFromDate(isoDate) {
  const parts = String(isoDate || '').split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return '';
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function upcomingHourly(hourly, timeZone, count, now) {
  const rows = Array.isArray(hourly) ? hourly : [];
  const current = now instanceof Date ? now : new Date();
  const limit = count || 12;
  let stamp = '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit'
    }).formatToParts(current);
    const map = {};
    parts.forEach((part) => {
      if (part.type !== 'literal') map[part.type] = part.value;
    });
    stamp = `${map.year}-${map.month}-${map.day}T${map.hour}`;
  } catch (err) {
    stamp = '';
  }
  const index = stamp
    ? rows.findIndex((row) => String(row.time || '').slice(0, 13) >= stamp)
    : 0;
  const start = index < 0 ? 0 : index;
  return rows.slice(start, start + limit);
}

function wantsWeather(config) {
  const cfg = config || {};
  return !!(
    cfg.showCity || cfg.showCondition || cfg.showTemperature || cfg.showFeelsLike
    || cfg.showMinMax || cfg.showHumidity || cfg.showWind || cfg.showPressure
    || cfg.showUv || cfg.showVisibility || cfg.showPrecip || cfg.showSun
    || cfg.showHourly || cfg.showDaily || cfg.showUpdated
  );
}

function formatVisibility(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1)} km`;
  return `${Math.round(n)} m`;
}

module.exports = {
  CLOCK_CONFIG_KEY,
  WEATHER_CACHE_KEY,
  DEFAULT_CLOCK_CONFIG,
  BOOLEAN_KEYS,
  normalizeClockConfig,
  loadClockConfig,
  saveClockConfig,
  weatherCodeInfo,
  isoWeekNumber,
  dayOfYear,
  daysInYear,
  moonPhase,
  greetingForHour,
  windDirectionLabel,
  formatUpdatedAgo,
  formatClockTime,
  formatLongDate,
  formatWeekday,
  formatUtcOffset,
  timezoneLabel,
  zoneShortName,
  isValidTimeZone,
  parseTimezoneList,
  roundMetric,
  tempSuffix,
  windSuffix,
  clockFromIso,
  hourLabel,
  weekdayShortFromDate,
  upcomingHourly,
  wantsWeather,
  formatVisibility
};
