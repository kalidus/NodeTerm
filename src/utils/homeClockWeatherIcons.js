'use strict';

import clearDay from '../assets/weather/meteocons/clear-day.svg';
import clearNight from '../assets/weather/meteocons/clear-night.svg';
import partlyCloudyDay from '../assets/weather/meteocons/partly-cloudy-day.svg';
import partlyCloudyNight from '../assets/weather/meteocons/partly-cloudy-night.svg';
import cloudy from '../assets/weather/meteocons/cloudy.svg';
import overcastDay from '../assets/weather/meteocons/overcast-day.svg';
import overcastNight from '../assets/weather/meteocons/overcast-night.svg';
import overcast from '../assets/weather/meteocons/overcast.svg';
import fogDay from '../assets/weather/meteocons/fog-day.svg';
import fogNight from '../assets/weather/meteocons/fog-night.svg';
import fog from '../assets/weather/meteocons/fog.svg';
import drizzle from '../assets/weather/meteocons/drizzle.svg';
import rain from '../assets/weather/meteocons/rain.svg';
import sleet from '../assets/weather/meteocons/sleet.svg';
import snow from '../assets/weather/meteocons/snow.svg';
import hail from '../assets/weather/meteocons/hail.svg';
import overcastRain from '../assets/weather/meteocons/overcast-rain.svg';
import overcastSnow from '../assets/weather/meteocons/overcast-snow.svg';
import thunderstorms from '../assets/weather/meteocons/thunderstorms.svg';
import thunderstormsRain from '../assets/weather/meteocons/thunderstorms-rain.svg';
import thunderstormsDay from '../assets/weather/meteocons/thunderstorms-day.svg';
import thunderstormsNight from '../assets/weather/meteocons/thunderstorms-night.svg';
import thunderstormsDayRain from '../assets/weather/meteocons/thunderstorms-day-rain.svg';
import thunderstormsNightRain from '../assets/weather/meteocons/thunderstorms-night-rain.svg';
import moonNew from '../assets/weather/meteocons/moon-new.svg';
import moonWaxingCrescent from '../assets/weather/meteocons/moon-waxing-crescent.svg';
import moonFirstQuarter from '../assets/weather/meteocons/moon-first-quarter.svg';
import moonWaxingGibbous from '../assets/weather/meteocons/moon-waxing-gibbous.svg';
import moonFull from '../assets/weather/meteocons/moon-full.svg';
import moonWaningGibbous from '../assets/weather/meteocons/moon-waning-gibbous.svg';
import moonLastQuarter from '../assets/weather/meteocons/moon-last-quarter.svg';
import moonWaningCrescent from '../assets/weather/meteocons/moon-waning-crescent.svg';

import {
  weatherMeteoconKey,
  weatherVisualKind,
  moonMeteoconKey
} from './homeClockWeatherIconsMap';

export { weatherMeteoconKey, weatherVisualKind, moonMeteoconKey };

export const METEOCON_SRC = {
  'clear-day': clearDay,
  'clear-night': clearNight,
  'partly-cloudy-day': partlyCloudyDay,
  'partly-cloudy-night': partlyCloudyNight,
  cloudy,
  'overcast-day': overcastDay,
  'overcast-night': overcastNight,
  overcast,
  'fog-day': fogDay,
  'fog-night': fogNight,
  fog,
  drizzle,
  rain,
  sleet,
  snow,
  hail,
  'overcast-rain': overcastRain,
  'overcast-snow': overcastSnow,
  thunderstorms,
  'thunderstorms-rain': thunderstormsRain,
  'thunderstorms-day': thunderstormsDay,
  'thunderstorms-night': thunderstormsNight,
  'thunderstorms-day-rain': thunderstormsDayRain,
  'thunderstorms-night-rain': thunderstormsNightRain,
  'moon-new': moonNew,
  'moon-waxing-crescent': moonWaxingCrescent,
  'moon-first-quarter': moonFirstQuarter,
  'moon-waxing-gibbous': moonWaxingGibbous,
  'moon-full': moonFull,
  'moon-waning-gibbous': moonWaningGibbous,
  'moon-last-quarter': moonLastQuarter,
  'moon-waning-crescent': moonWaningCrescent
};

export function getMeteoconSrc(key) {
  if (key && METEOCON_SRC[key]) return METEOCON_SRC[key];
  return METEOCON_SRC.cloudy;
}
