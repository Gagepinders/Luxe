export type DailyForecast = {
  date: string;
  weatherCode: number;
  tempMaxF: number;
  tempMinF: number;
  snowfallIn: number;
  precipChance: number;
};

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

export async function getForecast(lat: number, lng: number): Promise<DailyForecast[] | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_probability_max&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=5`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const days: string[] = data.daily.time;
    return days.map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weathercode[i],
      tempMaxF: Math.round(data.daily.temperature_2m_max[i]),
      tempMinF: Math.round(data.daily.temperature_2m_min[i]),
      snowfallIn: data.daily.snowfall_sum[i],
      precipChance: data.daily.precipitation_probability_max[i],
    }));
  } catch {
    return null;
  }
}
