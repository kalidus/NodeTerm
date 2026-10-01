const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  CLOCK_CONFIG_KEY,
  DEFAULT_CLOCK_CONFIG,
  normalizeClockConfig,
  loadClockConfig,
  saveClockConfig,
  weatherCodeInfo,
  isoWeekNumber,
  dayOfYear,
  daysInYear,
  moonPhase,
  formatUtcOffset,
  upcomingHourly,
  parseTimezoneList,
  wantsWeather
} = require('../../src/utils/homeClock');

function memoryStorage(initial) {
  const map = { ...(initial || {}) };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
    },
    setItem(key, value) {
      map[key] = String(value);
    }
  };
}

describe('home clock config', () => {
  it('usa hora, fecha, saludo, ciudad, temperatura y 3 dias por defecto', () => {
    const config = normalizeClockConfig(null);
    assert.strictEqual(config.showTime, true);
    assert.strictEqual(config.showSeconds, true);
    assert.strictEqual(config.hour12, false);
    assert.strictEqual(config.showLongDate, true);
    assert.strictEqual(config.showGreeting, true);
    assert.strictEqual(config.showTimezone, false);
    assert.strictEqual(config.showCity, true);
    assert.strictEqual(config.showCondition, true);
    assert.strictEqual(config.showTemperature, true);
    assert.strictEqual(config.showDaily, true);
    assert.strictEqual(config.showHourly, false);
    assert.strictEqual(config.dailyDays, 3);
    assert.strictEqual(config.useIpLocation, false);
    assert.strictEqual(config.city, '');
    assert.strictEqual(config.refreshMinutes, 30);
    assert.deepStrictEqual(config.extraTimezones, []);
    assert.strictEqual(config.showFeelsLike, DEFAULT_CLOCK_CONFIG.showFeelsLike);
  });

  it('corrige dias, refresco y zonas invalidas', () => {
    const config = normalizeClockConfig({
      dailyDays: 4,
      refreshMinutes: 10,
      tempUnit: 'f',
      windUnit: 'ms',
      city: '  Madrid  ',
      extraTimezones: ['UTC', 'No/Existe', 'America/New_York', 'UTC']
    });
    assert.strictEqual(config.dailyDays, 3);
    assert.strictEqual(config.refreshMinutes, 30);
    assert.strictEqual(config.tempUnit, 'f');
    assert.strictEqual(config.windUnit, 'ms');
    assert.strictEqual(config.city, 'Madrid');
    assert.deepStrictEqual(config.extraTimezones, ['UTC', 'America/New_York']);
  });

  it('acepta 5 y 7 dias y refrescos de 15 y 60', () => {
    assert.strictEqual(normalizeClockConfig({ dailyDays: 5, refreshMinutes: 15 }).dailyDays, 5);
    assert.strictEqual(normalizeClockConfig({ dailyDays: 7, refreshMinutes: 60 }).refreshMinutes, 60);
    assert.strictEqual(normalizeClockConfig({ dailyDays: '7' }).dailyDays, 7);
  });

  it('guarda y recupera la config sin mezclarla con el layout', () => {
    const store = memoryStorage();
    saveClockConfig({ city: 'Bilbao', showWind: true, hour12: true }, store);
    const loaded = loadClockConfig(store);
    assert.strictEqual(loaded.city, 'Bilbao');
    assert.strictEqual(loaded.showWind, true);
    assert.strictEqual(loaded.hour12, true);
    assert.strictEqual(loaded.showTime, true);
    assert.ok(store.getItem(CLOCK_CONFIG_KEY));
  });

  it('ignora json roto', () => {
    const store = memoryStorage({ [CLOCK_CONFIG_KEY]: '{no' });
    const loaded = loadClockConfig(store);
    assert.strictEqual(loaded.showTemperature, true);
    assert.strictEqual(loaded.city, '');
  });

  it('no pide clima si solo queda la fase lunar', () => {
    const config = normalizeClockConfig({
      showCity: false,
      showCondition: false,
      showTemperature: false,
      showDaily: false,
      showUpdated: false,
      showMoon: true
    });
    assert.strictEqual(wantsWeather(config), false);
  });
});

describe('codigos de clima WMO', () => {
  it('mapea despejado, lluvia y tormenta', () => {
    assert.deepStrictEqual(weatherCodeInfo(0), { label: 'Despejado', icon: 'pi pi-sun' });
    assert.strictEqual(weatherCodeInfo(0, false).icon, 'pi pi-moon');
    assert.strictEqual(weatherCodeInfo(61).label, 'Lluvia debil');
    assert.strictEqual(weatherCodeInfo(63).icon, 'pi pi-cloud');
    assert.deepStrictEqual(weatherCodeInfo(95), { label: 'Tormenta', icon: 'pi pi-bolt' });
    assert.strictEqual(weatherCodeInfo(999).label, 'Sin datos');
  });
});

describe('fecha local', () => {
  it('calcula la semana ISO', () => {
    assert.strictEqual(isoWeekNumber(new Date(2020, 0, 1)), 1);
    assert.strictEqual(isoWeekNumber(new Date(2021, 0, 1)), 53);
    assert.strictEqual(isoWeekNumber(new Date(2005, 0, 3)), 1);
  });

  it('calcula el dia del ano', () => {
    assert.strictEqual(dayOfYear(new Date(2026, 0, 1)), 1);
    assert.strictEqual(dayOfYear(new Date(2026, 9, 1)), 274);
    assert.strictEqual(daysInYear(new Date(2024, 5, 1)), 366);
    assert.strictEqual(daysInYear(new Date(2026, 5, 1)), 365);
  });

  it('etiqueta el desfase UTC de una zona fija', () => {
    assert.strictEqual(formatUtcOffset(new Date('2026-10-01T12:00:00Z'), 'UTC'), 'UTC+0');
    assert.strictEqual(formatUtcOffset(new Date('2026-10-01T12:00:00Z'), 'Europe/Madrid'), 'UTC+2');
    assert.strictEqual(formatUtcOffset(new Date('2026-01-15T12:00:00Z'), 'Europe/Madrid'), 'UTC+1');
  });
});

describe('fase lunar', () => {
  it('marca luna nueva el 6 de enero de 2000 y llena hacia el 21', () => {
    assert.strictEqual(moonPhase(new Date(2000, 0, 6)).name, 'Luna nueva');
    assert.strictEqual(moonPhase(new Date(2000, 0, 6)).index, 0);
    assert.strictEqual(moonPhase(new Date(2000, 0, 21)).name, 'Luna llena');
    assert.strictEqual(moonPhase(new Date(2000, 0, 21)).index, 4);
  });

  it('devuelve una fase conocida', () => {
    const names = [
      'Luna nueva',
      'Creciente',
      'Cuarto creciente',
      'Gibosa creciente',
      'Luna llena',
      'Gibosa menguante',
      'Cuarto menguante',
      'Menguante'
    ];
    const phase = moonPhase(new Date(2026, 9, 1));
    assert.ok(names.includes(phase.name));
    assert.ok(phase.index >= 0 && phase.index <= 7);
  });
});

describe('prevision horaria', () => {
  it('recorta desde la hora local de la zona del clima', () => {
    const rows = [
      { time: '2026-10-01T10:00' },
      { time: '2026-10-01T11:00' },
      { time: '2026-10-01T12:00' },
      { time: '2026-10-01T13:00' }
    ];
    const got = upcomingHourly(rows, 'UTC', 2, new Date('2026-10-01T11:30:00Z'));
    assert.deepStrictEqual(got.map((row) => row.time), [
      '2026-10-01T11:00',
      '2026-10-01T12:00'
    ]);
  });

  it('filtra zonas al parsear la lista', () => {
    assert.deepStrictEqual(parseTimezoneList('UTC, Nope, America/New_York'), ['UTC', 'America/New_York']);
  });
});
