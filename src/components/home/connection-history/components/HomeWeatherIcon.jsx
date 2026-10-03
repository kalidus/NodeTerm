import React from 'react';
import { weatherCodeInfo } from '../../../../utils/homeClock';
import {
  getMeteoconSrc,
  moonMeteoconKey,
  weatherMeteoconKey
} from '../../../../utils/homeClockWeatherIcons';

const SIZE_CLASS = {
  hero: 'home-weather-icon--hero',
  forecast: 'home-weather-icon--forecast',
  moon: 'home-weather-icon--moon'
};

export function HomeWeatherIcon({
  code,
  isDay = true,
  size = 'forecast',
  moonPhaseIndex,
  title
}) {
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.forecast;
  let assetKey;
  let label;

  if (size === 'moon' && moonPhaseIndex != null) {
    assetKey = moonMeteoconKey(moonPhaseIndex);
    label = title || '';
  } else {
    const info = weatherCodeInfo(code, isDay);
    assetKey = weatherMeteoconKey(code, isDay);
    label = title || info.label;
  }

  const src = getMeteoconSrc(assetKey);
  if (!src) {
    const info = weatherCodeInfo(code, isDay);
    return (
      <i
        className={`${info.icon} home-weather-icon-fallback ${sizeClass}`}
        title={label}
        aria-hidden={!label}
      />
    );
  }

  return (
    <img
      className={`home-weather-icon ${sizeClass}`}
      src={src}
      alt=""
      title={label}
      draggable={false}
    />
  );
}

export default HomeWeatherIcon;
