import {
  WEATHER_CACHE_KEY,
  roundMetric
} from '../utils/homeClock';

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const IP_URL = 'https://ipwho.is/';

function defaultStorage() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage;
}

function fetchTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

async function readJson(url, fetchImpl) {
  const response = await fetchImpl(url, { signal: fetchTimeoutSignal(12000) });
  if (!response.ok) {
    throw new Error('clima no disponible');
  }
  return response.json();
}

export function readWeatherCache(storage) {
  const store = storage || defaultStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.payload || !parsed.key) return null;
    return parsed;
  } catch (err) {
    return null;
  }
}

export function writeWeatherCache(entry, storage) {
  const store = storage || defaultStorage();
  if (!store || !entry) return;
  try {
    store.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    // cache opcional
  }
}

export function weatherCacheKey(config, location) {
  const lat = Number(location && location.latitude);
  const lon = Number(location && location.longitude);
  const temp = config && config.tempUnit === 'f' ? 'f' : 'c';
  const wind = config && config.windUnit === 'ms' ? 'ms' : 'kmh';
  return `${lat.toFixed(2)},${lon.toFixed(2)}|${temp}|${wind}`;
}

export function cacheIsFresh(fetchedAt, refreshMinutes, now) {
  const then = new Date(fetchedAt).getTime();
  if (!fetchedAt || Number.isNaN(then)) return false;
  const current = now instanceof Date ? now.getTime() : Date.now();
  const minutes = refreshMinutes === 15 || refreshMinutes === 60 ? refreshMinutes : 30;
  return current - then < minutes * 60000;
}

async function resolveLocation(config, fetchImpl) {
  const city = (config.city || '').trim();
  if (city) {
    const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=es&format=json`;
    const data = await readJson(url, fetchImpl);
    const hit = data && Array.isArray(data.results) ? data.results[0] : null;
    if (!hit) {
      return { error: 'not-found' };
    }
    return {
      name: hit.name,
      country: hit.country || '',
      admin: hit.admin1 || '',
      latitude: hit.latitude,
      longitude: hit.longitude,
      timezone: hit.timezone || 'auto'
    };
  }
  if (config.useIpLocation) {
    const data = await readJson(IP_URL, fetchImpl);
    if (!data || data.success === false || data.latitude == null || data.longitude == null) {
      return { error: 'ip' };
    }
    const zone = data.timezone && (data.timezone.id || data.timezone);
    return {
      name: data.city || 'Aqui',
      country: data.country || '',
      admin: data.region || '',
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: typeof zone === 'string' && zone ? zone : 'auto'
    };
  }
  return null;
}

function mapForecast(json, location) {
  const current = json.current || {};
  const hourlyIn = json.hourly || {};
  const dailyIn = json.daily || {};
  const hourly = (hourlyIn.time || []).map((time, index) => ({
    time,
    temperature: hourlyIn.temperature_2m ? hourlyIn.temperature_2m[index] : null,
    code: hourlyIn.weather_code ? hourlyIn.weather_code[index] : null,
    precip: hourlyIn.precipitation_probability ? hourlyIn.precipitation_probability[index] : null
  }));
  const daily = (dailyIn.time || []).map((date, index) => ({
    date,
    code: dailyIn.weather_code ? dailyIn.weather_code[index] : null,
    min: dailyIn.temperature_2m_min ? dailyIn.temperature_2m_min[index] : null,
    max: dailyIn.temperature_2m_max ? dailyIn.temperature_2m_max[index] : null,
    sunrise: dailyIn.sunrise ? dailyIn.sunrise[index] : null,
    sunset: dailyIn.sunset ? dailyIn.sunset[index] : null,
    uv: dailyIn.uv_index_max ? dailyIn.uv_index_max[index] : null,
    precip: dailyIn.precipitation_probability_max ? dailyIn.precipitation_probability_max[index] : null
  }));

  const currentHour = String(current.time || '').slice(0, 13);
  const hourMatch = hourly.find((row) => String(row.time || '').slice(0, 13) === currentHour) || hourly[0];

  const labelParts = [location.name, location.country].filter(Boolean);
  return {
    fetchedAt: new Date().toISOString(),
    location: {
      name: location.name,
      country: location.country || '',
      admin: location.admin || '',
      label: labelParts.join(', '),
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: json.timezone || location.timezone || 'auto'
    },
    current: {
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      feelsLike: current.apparent_temperature,
      code: current.weather_code,
      isDay: current.is_day,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      pressure: current.pressure_msl,
      visibility: current.visibility,
      precip: hourMatch ? hourMatch.precip : null
    },
    hourly,
    daily,
    min: daily[0] ? roundMetric(daily[0].min) : null,
    max: daily[0] ? roundMetric(daily[0].max) : null
  };
}

async function requestForecast(location, config, fetchImpl) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'pressure_msl',
      'visibility'
    ].join(','),
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_probability_max'
    ].join(','),
    timezone: location.timezone || 'auto',
    forecast_days: '7',
    temperature_unit: config.tempUnit === 'f' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: config.windUnit === 'ms' ? 'ms' : 'kmh'
  });
  const json = await readJson(`${FORECAST_URL}?${params.toString()}`, fetchImpl);
  return mapForecast(json, location);
}

function staleFromCache(cached, message) {
  if (!cached || !cached.payload) return null;
  return {
    ...cached.payload,
    ok: true,
    stale: true,
    message
  };
}

export async function fetchHomeWeather(config, options) {
  const opts = options || {};
  const fetchImpl = opts.fetchImpl || fetch;
  const storage = opts.storage;
  const cached = readWeatherCache(storage);

  let location;
  try {
    location = await resolveLocation(config, fetchImpl);
  } catch (err) {
    const stale = staleFromCache(cached, 'Sin red. Se muestra el ultimo dato guardado.');
    if (stale) return stale;
    return { ok: false, reason: 'network', message: 'No se pudo obtener el clima.' };
  }

  if (!location) {
    return { ok: false, reason: 'no-location' };
  }
  if (location.error === 'not-found') {
    return { ok: false, reason: 'not-found', message: 'No se encontro la ciudad.' };
  }
  if (location.error) {
    const stale = staleFromCache(cached, 'Sin red. Se muestra el ultimo dato guardado.');
    if (stale) return stale;
    return { ok: false, reason: 'ip', message: 'No se pudo detectar la ubicacion.' };
  }

  const key = weatherCacheKey(config, location);
  if (!opts.force && cached && cached.key === key && cacheIsFresh(cached.fetchedAt, config.refreshMinutes, opts.now)) {
    return { ...cached.payload, ok: true, stale: false };
  }

  try {
    const payload = await requestForecast(location, config, fetchImpl);
    writeWeatherCache({ key, fetchedAt: payload.fetchedAt, payload }, storage);
    return { ...payload, ok: true, stale: false };
  } catch (err) {
    const stale = staleFromCache(cached, 'Sin red. Se muestra el ultimo dato guardado.');
    if (stale) return stale;
    return { ok: false, reason: 'network', message: 'No se pudo obtener el clima.' };
  }
}
