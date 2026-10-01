import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../../../styles/components/home-clock.css';
import {
  clockFromIso,
  dayOfYear,
  daysInYear,
  formatClockTime,
  formatLongDate,
  formatUpdatedAgo,
  formatVisibility,
  formatWeekday,
  greetingForHour,
  hourLabel,
  isoWeekNumber,
  loadClockConfig,
  moonPhase,
  normalizeClockConfig,
  parseTimezoneList,
  roundMetric,
  saveClockConfig,
  tempSuffix,
  timezoneLabel,
  weatherCodeInfo,
  upcomingHourly,
  weekdayShortFromDate,
  wantsWeather,
  windDirectionLabel,
  windSuffix,
  zoneShortName
} from '../../../../utils/homeClock';
import { fetchHomeWeather } from '../../../../services/HomeClockWeatherService';

const TOGGLE_GROUPS = [
  {
    id: 'reloj',
    label: 'Reloj',
    items: [
      { key: 'showTime', label: 'Hora' },
      { key: 'showSeconds', label: 'Segundos' },
      { key: 'hour12', label: 'Formato 12 h' },
      { key: 'showGreeting', label: 'Saludo' },
      { key: 'showTimezone', label: 'Zona horaria' }
    ]
  },
  {
    id: 'fecha',
    label: 'Fecha',
    items: [
      { key: 'showLongDate', label: 'Fecha larga' },
      { key: 'showWeekday', label: 'Dia de la semana' },
      { key: 'showIsoWeek', label: 'Semana ISO' },
      { key: 'showDayOfYear', label: 'Dia del ano' }
    ]
  },
  {
    id: 'clima',
    label: 'Clima',
    items: [
      { key: 'showCity', label: 'Ciudad' },
      { key: 'showCondition', label: 'Condicion' },
      { key: 'showTemperature', label: 'Temperatura' },
      { key: 'showFeelsLike', label: 'Sensacion termica' },
      { key: 'showMinMax', label: 'Minima y maxima' },
      { key: 'showHumidity', label: 'Humedad' },
      { key: 'showWind', label: 'Viento' },
      { key: 'showPressure', label: 'Presion' },
      { key: 'showUv', label: 'Indice UV' },
      { key: 'showVisibility', label: 'Visibilidad' },
      { key: 'showPrecip', label: 'Probabilidad de lluvia' },
      { key: 'showSun', label: 'Amanecer y anochecer' },
      { key: 'showMoon', label: 'Fase lunar' },
      { key: 'showUpdated', label: 'Ultima actualizacion' }
    ]
  },
  {
    id: 'prevision',
    label: 'Prevision',
    items: [
      { key: 'showHourly', label: 'Proximas 12 horas' },
      { key: 'showDaily', label: 'Proximos dias' }
    ]
  }
];

export const HomeClockPanel = () => {
  const rootRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const [config, setConfig] = useState(() => loadClockConfig());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState(() => loadClockConfig().city);
  const [zonesDraft, setZonesDraft] = useState(() => loadClockConfig().extraTimezones.join(', '));
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [loading, setLoading] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => saveClockConfig(normalizeClockConfig({ ...prev, ...patch })));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cityDraft.trim() !== config.city) {
        updateConfig({ city: cityDraft });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cityDraft, config.city, updateConfig]);

  const weatherSig = [
    config.city,
    config.useIpLocation ? '1' : '0',
    config.tempUnit,
    config.windUnit,
    String(config.refreshMinutes),
    wantsWeather(config) ? '1' : '0'
  ].join('|');

  useEffect(() => {
    const current = configRef.current;
    if (!wantsWeather(current)) {
      setLoading(false);
      setWeatherError('');
      return undefined;
    }
    if (!current.city && !current.useIpLocation) {
      setWeather(null);
      setWeatherError('');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const run = async () => {
      const cfg = configRef.current;
      setLoading(true);
      const data = await fetchHomeWeather(cfg);
      if (cancelled) return;
      setLoading(false);
      if (!data || data.ok === false) {
        if (data && data.reason === 'no-location') {
          setWeather(null);
          setWeatherError('');
          return;
        }
        setWeather(null);
        setWeatherError((data && data.message) || 'No se pudo obtener el clima.');
        return;
      }
      setWeather(data);
      setWeatherError(data.stale ? (data.message || 'Sin red. Se muestra el ultimo dato guardado.') : '');
    };

    run();
    const timer = setInterval(run, current.refreshMinutes * 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [weatherSig]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onDown = (event) => {
      const target = event.target;
      if (target && target.closest && (target.closest('.home-clock-settings') || target.closest('.home-clock-gear'))) {
        return;
      }
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [settingsOpen]);

  const localZone = useMemo(() => timezoneLabel(now), [now]);
  const moon = useMemo(() => moonPhase(now), [now]);
  const unit = tempSuffix(config.tempUnit);
  const windUnit = windSuffix(config.windUnit);
  const current = weather && weather.current ? weather.current : null;
  const condition = current ? weatherCodeInfo(current.code, current.isDay !== 0) : null;
  const today = weather && Array.isArray(weather.daily) ? weather.daily[0] : null;
  const hours = useMemo(
    () => upcomingHourly(
      weather && weather.hourly,
      weather && weather.location && weather.location.timezone,
      12,
      now
    ),
    [weather, now]
  );
  const days = weather && Array.isArray(weather.daily)
    ? weather.daily.slice(0, config.dailyDays)
    : [];

  const metaBits = [];
  if (config.showIsoWeek) metaBits.push(`semana ${isoWeekNumber(now)}`);
  if (config.showDayOfYear) metaBits.push(`dia ${dayOfYear(now)}/${daysInYear(now)}`);

  const chips = [];
  if (current && config.showFeelsLike && roundMetric(current.feelsLike) != null) {
    chips.push(`Sensacion ${roundMetric(current.feelsLike)} ${unit}`);
  }
  if (config.showMinMax && today && roundMetric(today.min) != null && roundMetric(today.max) != null) {
    chips.push(`${roundMetric(today.min)} / ${roundMetric(today.max)} ${unit}`);
  }
  if (current && config.showHumidity && roundMetric(current.humidity) != null) {
    chips.push(`Humedad ${roundMetric(current.humidity)}%`);
  }
  if (current && config.showWind && roundMetric(current.windSpeed) != null) {
    const dir = windDirectionLabel(current.windDirection);
    chips.push(`Viento ${roundMetric(current.windSpeed)} ${windUnit}${dir ? ` ${dir}` : ''}`);
  }
  if (current && config.showPressure && roundMetric(current.pressure) != null) {
    chips.push(`${roundMetric(current.pressure)} hPa`);
  }
  if (config.showUv && today && Number.isFinite(Number(today.uv))) {
    chips.push(`UV ${Number(today.uv).toFixed(1)}`);
  }
  if (current && config.showVisibility && formatVisibility(current.visibility)) {
    chips.push(formatVisibility(current.visibility));
  }
  if (current && config.showPrecip && roundMetric(current.precip) != null) {
    chips.push(`Lluvia ${roundMetric(current.precip)}%`);
  }
  if (config.showSun && today && (today.sunrise || today.sunset)) {
    const rise = clockFromIso(today.sunrise);
    const set = clockFromIso(today.sunset);
    if (rise || set) chips.push(`Sol ${rise || '--'} / ${set || '--'}`);
  }

  const showWeatherBlock = !!(weather && weather.location && (
    config.showCity || config.showCondition || config.showTemperature
  ));
  const needsLocation = wantsWeather(config) && !config.city && !config.useIpLocation;

  return (
    <div className="home-clock" ref={rootRef}>
      <div className="home-clock-top">
        {config.showGreeting ? <div className="home-clock-greeting">{greetingForHour(now.getHours())}</div> : <span />}
        <button
          type="button"
          className={`home-clock-gear no-drag${settingsOpen ? ' is-open' : ''}`}
          title="Ajustes del reloj"
          aria-expanded={settingsOpen}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <i className="pi pi-cog" />
        </button>
      </div>

      {config.showTime && (
        <div className="home-clock-time">
          {formatClockTime(now, { hour12: config.hour12, showSeconds: config.showSeconds })}
        </div>
      )}
      {config.showLongDate && <div className="home-clock-date">{formatLongDate(now)}</div>}
      {config.showWeekday && !config.showLongDate && <div className="home-clock-date">{formatWeekday(now)}</div>}
      {metaBits.length > 0 && <div className="home-clock-meta">{metaBits.join(' · ')}</div>}
      {config.showTimezone && (
        <div className="home-clock-meta">{localZone.id}{localZone.offset ? ` · ${localZone.offset}` : ''}</div>
      )}

      {config.extraTimezones.length > 0 && (
        <div className="home-clock-zones">
          {config.extraTimezones.map((zone) => (
            <div key={zone} className="home-clock-zone">
              <span>{zoneShortName(zone)}</span>
              <strong>{formatClockTime(now, { hour12: config.hour12, showSeconds: false, timeZone: zone })}</strong>
            </div>
          ))}
        </div>
      )}

      {showWeatherBlock && weather && weather.location && (
        <div className="home-clock-now">
          {config.showCity && <span>{weather.location.label || weather.location.name}</span>}
          {config.showCondition && condition && (
            <>
              <i className={condition.icon} />
              <span>{condition.label}</span>
            </>
          )}
          {config.showTemperature && current && roundMetric(current.temperature) != null && (
            <strong>{roundMetric(current.temperature)} {unit}</strong>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="home-clock-chips">
          {chips.map((chip) => <span key={chip} className="home-clock-chip">{chip}</span>)}
        </div>
      )}

      {config.showHourly && hours.length > 0 && (
        <>
          <div className="home-clock-section-label">Proximas horas</div>
          <div className="home-clock-forecast">
            {hours.map((row) => {
              const info = weatherCodeInfo(row.code, true);
              return (
                <div key={row.time} className="home-clock-slot">
                  <span>{hourLabel(row.time)}</span>
                  <i className={info.icon} title={info.label} />
                  <span>{roundMetric(row.temperature) != null ? `${roundMetric(row.temperature)}` : '--'}</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {config.showDaily && days.length > 0 && (
        <>
          <div className="home-clock-section-label">Proximos dias</div>
          <div className="home-clock-forecast">
            {days.map((row) => {
              const info = weatherCodeInfo(row.code, true);
              return (
                <div key={row.date} className="home-clock-slot">
                  <span>{weekdayShortFromDate(row.date)}</span>
                  <i className={info.icon} title={info.label} />
                  <span>
                    {roundMetric(row.max) != null ? roundMetric(row.max) : '--'}
                    {' / '}
                    {roundMetric(row.min) != null ? roundMetric(row.min) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {config.showMoon && (
        <div className="home-clock-moon">
          <i className={moon.icon} />
          <span>{moon.name}</span>
        </div>
      )}

      {loading && !weather && <div className="home-clock-hint">Cargando clima...</div>}
      {needsLocation && <div className="home-clock-hint">Escribe una ciudad en el engranaje para ver el clima.</div>}
      {weatherError && <div className="home-clock-error">{weatherError}</div>}
      {config.showUpdated && weather && weather.fetchedAt && (
        <div className="home-clock-meta">{formatUpdatedAgo(weather.fetchedAt, now)}</div>
      )}

      {settingsOpen && (
        <div className="home-clock-settings no-drag">
          <div className="home-clock-field">
            <span>Ciudad</span>
            <input
              type="text"
              value={cityDraft}
              placeholder="Madrid"
              maxLength={80}
              onChange={(event) => setCityDraft(event.target.value)}
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={!!config.useIpLocation}
              onChange={(event) => updateConfig({ useIpLocation: event.target.checked })}
            />
            Si la ciudad esta vacia, usar ubicacion por IP
          </label>
          <div className="home-clock-field">
            <span>Otras zonas (separadas por coma)</span>
            <input
              type="text"
              value={zonesDraft}
              placeholder="UTC, America/New_York"
              onChange={(event) => setZonesDraft(event.target.value)}
              onBlur={() => {
                const zones = parseTimezoneList(zonesDraft);
                setZonesDraft(zones.join(', '));
                updateConfig({ extraTimezones: zones });
              }}
            />
          </div>
          <div className="home-clock-field">
            <span>Temperatura</span>
            <select value={config.tempUnit} onChange={(event) => updateConfig({ tempUnit: event.target.value })}>
              <option value="c">Celsius</option>
              <option value="f">Fahrenheit</option>
            </select>
          </div>
          <div className="home-clock-field">
            <span>Viento</span>
            <select value={config.windUnit} onChange={(event) => updateConfig({ windUnit: event.target.value })}>
              <option value="kmh">km/h</option>
              <option value="ms">m/s</option>
            </select>
          </div>
          <div className="home-clock-field">
            <span>Refresco del clima</span>
            <select
              value={String(config.refreshMinutes)}
              onChange={(event) => updateConfig({ refreshMinutes: Number(event.target.value) })}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
            </select>
          </div>
          {config.showDaily && (
            <div className="home-clock-field">
              <span>Dias de prevision</span>
              <select
                value={String(config.dailyDays)}
                onChange={(event) => updateConfig({ dailyDays: Number(event.target.value) })}
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="7">7</option>
              </select>
            </div>
          )}
          {TOGGLE_GROUPS.map((group) => (
            <div key={group.id} className="home-clock-settings-group">
              <div className="home-clock-section-label">{group.label}</div>
              {group.items.map((item) => (
                <label key={item.key}>
                  <input
                    type="checkbox"
                    checked={!!config[item.key]}
                    onChange={(event) => updateConfig({ [item.key]: event.target.checked })}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeClockPanel;
