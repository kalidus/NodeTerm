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
import HomeWeatherIcon from './HomeWeatherIcon';
import { weatherVisualKind } from '../../../../utils/homeClockWeatherIcons';

function dateFromDailyKey(dateStr) {
  const parts = String(dateStr || '').split('-');
  if (parts.length >= 3) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatLongDateFromKey(dateStr) {
  return formatLongDate(dateFromDailyKey(dateStr));
}

function buildNowDetailLines(ctx) {
  const {
    current, today, unit, windUnit, moon, weather, now, config
  } = ctx;
  const lines = [];
  if (!current) return lines;

  if (roundMetric(current.temperature) != null) {
    lines.push({ k: 'Temperatura', v: `${roundMetric(current.temperature)} ${unit}` });
  }
  if (roundMetric(current.feelsLike) != null) {
    lines.push({ k: 'Sensacion', v: `${roundMetric(current.feelsLike)} ${unit}` });
  }
  if (today && roundMetric(today.min) != null && roundMetric(today.max) != null) {
    lines.push({ k: 'Min / max hoy', v: `${roundMetric(today.min)} / ${roundMetric(today.max)} ${unit}` });
  }
  if (roundMetric(current.humidity) != null) {
    lines.push({ k: 'Humedad', v: `${roundMetric(current.humidity)}%` });
  }
  if (roundMetric(current.windSpeed) != null) {
    const dir = windDirectionLabel(current.windDirection);
    lines.push({
      k: 'Viento',
      v: `${roundMetric(current.windSpeed)} ${windUnit}${dir ? ` ${dir}` : ''}`
    });
  }
  if (roundMetric(current.pressure) != null) {
    lines.push({ k: 'Presion', v: `${roundMetric(current.pressure)} hPa` });
  }
  const vis = formatVisibility(current.visibility);
  if (vis) lines.push({ k: 'Visibilidad', v: vis });
  if (roundMetric(current.precip) != null) {
    lines.push({ k: 'Prob. lluvia', v: `${roundMetric(current.precip)}%` });
  }
  if (today && Number.isFinite(Number(today.uv))) {
    lines.push({ k: 'UV max', v: Number(today.uv).toFixed(1) });
  }
  if (today && (today.sunrise || today.sunset)) {
    const rise = clockFromIso(today.sunrise);
    const set = clockFromIso(today.sunset);
    if (rise || set) lines.push({ k: 'Sol', v: `${rise || '--'} / ${set || '--'}` });
  }
  if (config.showMoon && moon && moon.name) {
    lines.push({ k: 'Luna', v: moon.name });
  }
  if (config.showUpdated && weather && weather.fetchedAt) {
    lines.push({ k: 'Actualizado', v: formatUpdatedAgo(weather.fetchedAt, now) });
  }
  return lines;
}

function buildDayDetailLines(row, unit) {
  const lines = [];
  const info = weatherCodeInfo(row.code, true);
  lines.push({ k: 'Condicion', v: info.label });
  if (roundMetric(row.max) != null && roundMetric(row.min) != null) {
    lines.push({ k: 'Max / min', v: `${roundMetric(row.max)} / ${roundMetric(row.min)} ${unit}` });
  }
  if (roundMetric(row.precip) != null) {
    lines.push({ k: 'Prob. lluvia', v: `${roundMetric(row.precip)}%` });
  }
  if (Number.isFinite(Number(row.uv))) {
    lines.push({ k: 'UV max', v: Number(row.uv).toFixed(1) });
  }
  if (row.sunrise || row.sunset) {
    const rise = clockFromIso(row.sunrise);
    const set = clockFromIso(row.sunset);
    if (rise || set) lines.push({ k: 'Sol', v: `${rise || '--'} / ${set || '--'}` });
  }
  return lines;
}

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
  const [overlayDetailKey, setOverlayDetailKey] = useState(null);
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

  const showWeatherBlock = !!(weather && weather.location && (
    config.showCity || config.showCondition || config.showTemperature
  ));
  const weatherKind = current ? weatherVisualKind(current.code) : 'cloud';

  const showAsideWind = !!(current && config.showWind && roundMetric(current.windSpeed) != null);
  const showAsidePrecip = !!(current && config.showPrecip && roundMetric(current.precip) != null);
  const showAsideFeels = !!(current && config.showFeelsLike && roundMetric(current.feelsLike) != null);
  const asideWindDir = current ? windDirectionLabel(current.windDirection) : '';

  const chips = [];
  if (current && config.showFeelsLike && !showAsideFeels && roundMetric(current.feelsLike) != null) {
    chips.push(`Sensacion ${roundMetric(current.feelsLike)} ${unit}`);
  }
  if (config.showMinMax && today && roundMetric(today.min) != null && roundMetric(today.max) != null) {
    chips.push(`${roundMetric(today.min)} / ${roundMetric(today.max)} ${unit}`);
  }
  if (current && config.showHumidity && roundMetric(current.humidity) != null) {
    chips.push(`Humedad ${roundMetric(current.humidity)}%`);
  }
  if (current && config.showWind && !showAsideWind && roundMetric(current.windSpeed) != null) {
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
  if (current && config.showPrecip && !showAsidePrecip && roundMetric(current.precip) != null) {
    chips.push(`Lluvia ${roundMetric(current.precip)}%`);
  }
  if (config.showSun && today && (today.sunrise || today.sunset)) {
    const rise = clockFromIso(today.sunrise);
    const set = clockFromIso(today.sunset);
    if (rise || set) chips.push(`Sol ${rise || '--'} / ${set || '--'}`);
  }

  const needsLocation = wantsWeather(config) && !config.city && !config.useIpLocation;

  const showClockBlock = config.showTime || config.showLongDate || config.showWeekday || config.showGreeting;
  const showHero = showClockBlock || (showWeatherBlock && current);
  const canExpandHero = !!(weather && weather.location && current);

  const nowDetailLines = useMemo(
    () => buildNowDetailLines({
      current, today, unit, windUnit, moon, weather, now, config
    }),
    [current, today, unit, windUnit, moon, weather, now, config]
  );

  const overlayDayRow = useMemo(() => {
    if (!overlayDetailKey || overlayDetailKey === 'now') return null;
    return days.find((row) => row.date === overlayDetailKey) || null;
  }, [overlayDetailKey, days]);

  const overlayDetailLines = useMemo(() => {
    if (overlayDetailKey === 'now') return nowDetailLines;
    if (overlayDayRow) return buildDayDetailLines(overlayDayRow, unit);
    return [];
  }, [overlayDetailKey, overlayDayRow, nowDetailLines, unit]);

  const overlayDetailHeader = useMemo(() => {
    if (overlayDetailKey === 'now' && weather && weather.location) {
      return {
        primary: weather.location.label || weather.location.name,
        secondary: condition ? condition.label : ''
      };
    }
    if (overlayDayRow) {
      const idx = days.findIndex((row) => row.date === overlayDayRow.date);
      const info = weatherCodeInfo(overlayDayRow.code, true);
      return {
        primary: idx === 0 ? 'Hoy' : weekdayShortFromDate(overlayDayRow.date),
        secondary: `${formatLongDateFromKey(overlayDayRow.date)}${info.label ? ` · ${info.label}` : ''}`
      };
    }
    return null;
  }, [overlayDetailKey, weather, condition, overlayDayRow, days]);

  const closeDetailSheet = useCallback(() => {
    setOverlayDetailKey(null);
  }, []);

  const openNowDetail = useCallback((event) => {
    if (!canExpandHero) return;
    event.stopPropagation();
    setOverlayDetailKey((prev) => (prev === 'now' ? null : 'now'));
  }, [canExpandHero]);

  const openDayDetail = useCallback((event, dateKey) => {
    event.stopPropagation();
    setOverlayDetailKey((prev) => (prev === dateKey ? null : dateKey));
  }, []);

  useEffect(() => {
    if (!overlayDetailKey) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') closeDetailSheet();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [overlayDetailKey, closeDetailSheet]);

  const handleHeroKey = useCallback((event) => {
    if (!canExpandHero) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openNowDetail(event);
  }, [canExpandHero, openNowDetail]);

  const clockLine = useMemo(() => {
    const parts = [];
    if (config.showTime) {
      parts.push(formatClockTime(now, { hour12: config.hour12, showSeconds: config.showSeconds }));
    }
    if (config.showLongDate) {
      parts.push(formatLongDate(now));
    } else if (config.showWeekday) {
      parts.push(formatWeekday(now));
    }
    return parts.join(' · ');
  }, [config.showTime, config.showSeconds, config.hour12, config.showLongDate, config.showWeekday, now]);

  const cardWeatherKind = current ? weatherKind : 'cloud';
  const cardClockOnly = showClockBlock && !(showWeatherBlock && current);

  return (
    <div className="home-clock" ref={rootRef}>
      {showHero && (
        <div
          className={`home-clock-card${cardClockOnly ? ' home-clock-card--clock-only' : ''}`}
          data-weather-kind={cardWeatherKind}
        >
          <button
            type="button"
            className={`home-clock-gear home-clock-card-gear no-drag${settingsOpen ? ' is-open' : ''}`}
            title="Ajustes del reloj"
            aria-expanded={settingsOpen}
            onClick={(event) => {
              event.stopPropagation();
              setSettingsOpen((open) => !open);
            }}
          >
            <i className="pi pi-cog" />
          </button>

          <div
            className={`home-clock-card-hero${canExpandHero ? ' home-clock-card-hero--interactive no-drag' : ''}`}
            role={canExpandHero ? 'button' : undefined}
            tabIndex={canExpandHero ? 0 : undefined}
            title={canExpandHero ? 'Pulsa para ver mas detalle' : undefined}
            onClick={canExpandHero ? openNowDetail : undefined}
            onKeyDown={canExpandHero ? handleHeroKey : undefined}
          >
            <div className="home-clock-card-primary">
              {config.showGreeting && (
                <div className="home-clock-greeting home-clock-greeting--in-card">
                  {greetingForHour(now.getHours())}
                </div>
              )}
              {showWeatherBlock && current && config.showTemperature && roundMetric(current.temperature) != null && (
                <div className="home-clock-card-temp">
                  {roundMetric(current.temperature)}
                  <span className="home-clock-temp-unit">{unit}</span>
                </div>
              )}
              {cardClockOnly && config.showTime && (
                <div className="home-clock-time home-clock-time--card-primary">
                  {formatClockTime(now, { hour12: config.hour12, showSeconds: config.showSeconds })}
                </div>
              )}
              {showWeatherBlock && weather && weather.location && config.showCity && (
                <div
                  className="home-clock-weather-city home-clock-weather-city--in-card"
                  title={weather.location.label || weather.location.name}
                >
                  {weather.location.label || weather.location.name}
                </div>
              )}
              {showWeatherBlock && config.showCondition && condition && (
                <div className="home-clock-weather-condition home-clock-weather-condition--in-card" title={condition.label}>
                  {condition.label}
                </div>
              )}
              {!cardClockOnly && clockLine && (
                <div className="home-clock-card-clockline" title={clockLine}>{clockLine}</div>
              )}
              {cardClockOnly && (config.showLongDate || config.showWeekday) && (
                <div className="home-clock-date home-clock-date--in-card" title={formatLongDate(now)}>
                  {config.showLongDate ? formatLongDate(now) : formatWeekday(now)}
                </div>
              )}
            </div>

            {showWeatherBlock && current && (
              <div className="home-clock-card-aside">
                <HomeWeatherIcon
                  code={current.code}
                  isDay={current.isDay}
                  size="hero"
                  title={condition ? condition.label : undefined}
                />
                {showAsideWind && (
                  <div className="home-clock-card-stat">
                    Viento: {roundMetric(current.windSpeed)} {windUnit}
                    {asideWindDir ? ` ${asideWindDir}` : ''}
                  </div>
                )}
                {showAsidePrecip && (
                  <div className="home-clock-card-stat">
                    Lluvia: {roundMetric(current.precip)}%
                  </div>
                )}
                {showAsideFeels && (
                  <div className="home-clock-card-stat">
                    Sensacion: {roundMetric(current.feelsLike)} {unit}
                  </div>
                )}
              </div>
            )}
          </div>

          {config.showDaily && days.length > 0 && (
            <div className="home-clock-card-forecast-band" aria-label="Proximos dias">
              <div className="home-clock-forecast home-clock-forecast--in-card">
                {days.map((row) => {
                  const info = weatherCodeInfo(row.code, true);
                  const daySelected = overlayDetailKey === row.date;
                  return (
                    <button
                      key={row.date}
                      type="button"
                      className={`home-clock-slot home-clock-slot--btn home-clock-slot--in-card no-drag${daySelected ? ' is-selected' : ''}`}
                      title={`${info.label}. Pulsa para detalle`}
                      onClick={(event) => openDayDetail(event, row.date)}
                    >
                      <span className="home-clock-slot-label">{weekdayShortFromDate(row.date)}</span>
                      <HomeWeatherIcon code={row.code} isDay size="forecast" title={info.label} />
                      <span className="home-clock-slot-temp">
                        {roundMetric(row.max) != null ? roundMetric(row.max) : '--'}
                        {' / '}
                        {roundMetric(row.min) != null ? roundMetric(row.min) : '--'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {overlayDetailKey && overlayDetailHeader && overlayDetailLines.length > 0 && (
            <div
              className="home-clock-detail-sheet no-drag"
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-clock-detail-title"
            >
              <button
                type="button"
                className="home-clock-detail-sheet__scrim"
                aria-label="Cerrar detalle"
                onClick={closeDetailSheet}
              />
              <div className="home-clock-detail-sheet__panel">
                <div className="home-clock-detail-sheet__head">
                  <div id="home-clock-detail-title" className="home-clock-detail-sheet__title">
                    <span className="home-clock-detail-sheet__title-main">{overlayDetailHeader.primary}</span>
                    {overlayDetailHeader.secondary && (
                      <span className="home-clock-detail-sheet__title-sub">{overlayDetailHeader.secondary}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="home-clock-detail-sheet__close"
                    aria-label="Cerrar"
                    onClick={closeDetailSheet}
                  >
                    <i className="pi pi-times" />
                  </button>
                </div>
                <div className="home-clock-detail-sheet__grid">
                  {overlayDetailLines.map((line) => (
                    <div key={line.k} className="home-clock-detail-sheet__cell">
                      <span className="home-clock-detail-sheet__cell-k">{line.k}</span>
                      <span className="home-clock-detail-sheet__cell-v">{line.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="home-clock-chips">
          {chips.map((chip) => <span key={chip} className="home-clock-chip">{chip}</span>)}
        </div>
      )}

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

      {config.showHourly && hours.length > 0 && (
        <>
          <div className="home-clock-section-label">Proximas horas</div>
          <div className="home-clock-forecast">
            {hours.map((row) => {
              const isDay = row.isDay !== 0;
              const info = weatherCodeInfo(row.code, isDay);
              return (
                <div key={row.time} className="home-clock-slot">
                  <span className="home-clock-slot-label">{hourLabel(row.time)}</span>
                  <HomeWeatherIcon code={row.code} isDay={isDay} size="forecast" title={info.label} />
                  <span className="home-clock-slot-temp">
                    {roundMetric(row.temperature) != null ? `${roundMetric(row.temperature)}` : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {config.showMoon && (
        <div className="home-clock-moon">
          <HomeWeatherIcon size="moon" moonPhaseIndex={moon.index} title={moon.name} />
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
