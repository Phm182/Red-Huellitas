import {
  DayPeriod,
  HueEnvironmentState,
  PlaceId,
  WeatherKind,
} from '../domain/types';
import { PERIOD_INDEX, PLACE_INDEX, WEATHER_INDEX } from '../rive/contract';

export function periodFromHour(hour: number): DayPeriod {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'day';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'night';
}

/**
 * Clima local: stub extensible.
 * Conectá OpenWeather / AccuWeather acá; mientras, heurística suave.
 */
export async function fetchLocalWeather(_coords?: {
  lat: number;
  lng: number;
}): Promise<WeatherKind> {
  // Placeholder determinista por hora (reemplazar por API real).
  const h = new Date().getHours();
  if (h >= 14 && h <= 16) return 'cloudy';
  if (h >= 3 && h <= 5) return 'rain';
  return 'clear';
}

export function buildEnvironment(
  place: PlaceId,
  weather: WeatherKind,
  now = new Date()
): HueEnvironmentState {
  const period = periodFromHour(now.getHours());
  const isNight = period === 'night' || period === 'dusk';
  const raining = weather === 'rain' || weather === 'storm';
  const outdoors = place === 'patio' || place === 'arbol' || place === 'plaza';
  return {
    place,
    period,
    weather,
    isNight,
    preferIndoors: raining && outdoors,
  };
}

export function environmentToRiveNumbers(env: HueEnvironmentState) {
  return {
    placeId: PLACE_INDEX[env.place],
    weatherId: WEATHER_INDEX[env.weather],
    periodId: PERIOD_INDEX[env.period],
    isNight: env.isNight,
    isRaining: env.weather === 'rain' || env.weather === 'storm',
    preferIndoors: env.preferIndoors,
  };
}

export const PLACES: { id: PlaceId; labelKey: string }[] = [
  { id: 'living', labelKey: 'juego.places.living' },
  { id: 'cocina', labelKey: 'juego.places.cocina' },
  { id: 'patio', labelKey: 'juego.places.patio' },
  { id: 'arbol', labelKey: 'juego.places.arbol' },
  { id: 'plaza', labelKey: 'juego.places.plaza' },
];
