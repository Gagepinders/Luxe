export type HourlyForecast = {
  time: string; // ISO timestamp, local to the location
  tempF: number;
  precipChance: number;
  snowfallIn: number; // accumulation during that hour
  weatherCode: number;
};

export type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMaxF: number;
  tempMinF: number;
  snowfallIn: number;
  precipChance: number;
};

export type LocationForecast = {
  hourly: HourlyForecast[]; // next 48 hours
  daily: DailyForecast[]; // next 7 days
  snowNext48hIn: number;
  snowNext7dIn: number;
  isSnowDay: boolean; // meaningful accumulation expected soon — plan plowing
};

// Below this, we don't bother flagging it as a "snow day" (just flurries).
const SNOW_DAY_THRESHOLD_IN = 1;

const WMO_DESCRIPTIONS: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫️" },
  48: { label: "Fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌦️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "🌨️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Rain showers", icon: "🌧️" },
  82: { label: "Violent showers", icon: "⛈️" },
  85: { label: "Snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm w/ hail", icon: "⛈️" },
  99: { label: "Thunderstorm w/ hail", icon: "⛈️" },
};

export function describeWeatherCode(code: number) {
  return WMO_DESCRIPTIONS[code] ?? { label: "—", icon: "🌡️" };
}

export async function getForecast(lat: number, lng: number): Promise<LocationForecast | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=temperature_2m,precipitation_probability,snowfall,weathercode` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_probability_max` +
      `&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=7`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();

    const hourlyTimes: string[] = data.hourly.time;
    const now = Date.now();
    const hourly: HourlyForecast[] = hourlyTimes
      .map((time: string, i: number) => ({
        time,
        tempF: Math.round(data.hourly.temperature_2m[i]),
        precipChance: data.hourly.precipitation_probability[i],
        snowfallIn: data.hourly.snowfall[i],
        weatherCode: data.hourly.weathercode[i],
      }))
      .filter((h) => new Date(h.time).getTime() >= now - 60 * 60 * 1000)
      .slice(0, 48);

    const dailyTimes: string[] = data.daily.time;
    const daily: DailyForecast[] = dailyTimes.map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weathercode[i],
      tempMaxF: Math.round(data.daily.temperature_2m_max[i]),
      tempMinF: Math.round(data.daily.temperature_2m_min[i]),
      snowfallIn: data.daily.snowfall_sum[i],
      precipChance: data.daily.precipitation_probability_max[i],
    }));

    const snowNext48hIn = hourly.slice(0, 48).reduce((s, h) => s + h.snowfallIn, 0);
    const snowNext7dIn = daily.reduce((s, d) => s + d.snowfallIn, 0);

    return {
      hourly,
      daily,
      snowNext48hIn,
      snowNext7dIn,
      isSnowDay: snowNext48hIn >= SNOW_DAY_THRESHOLD_IN,
    };
  } catch {
    return null;
  }
}

export type MonitoredArea = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  propertyCount: number;
};

export async function getForecastsForAreas(
  areas: MonitoredArea[]
): Promise<(MonitoredArea & { forecast: LocationForecast | null })[]> {
  const forecasts = await Promise.all(areas.map((a) => getForecast(a.lat, a.lng)));
  return areas.map((a, i) => ({ ...a, forecast: forecasts[i] }));
}
