export type Place = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  timezone?: string;
};

export type DayForecast = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
  wind: number;
  sunrise?: string;
  sunset?: string;
};

export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Mainly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Variable conditions";
}

export function weatherIcon(code: number) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

export function seasonGuide(latitude: number) {
  const north = latitude >= 0;
  return north
    ? [
        { season: "Spring", months: "March – May", note: "Often a pleasant shoulder season in many destinations." },
        { season: "Summer", months: "June – August", note: "Longer days; some regions may be hot or rainy." },
        { season: "Autumn", months: "September – November", note: "Can bring milder temperatures and changing foliage." },
        { season: "Winter", months: "December – February", note: "Cooler conditions; ideal for snow destinations." }
      ]
    : [
        { season: "Spring", months: "September – November", note: "Often a pleasant shoulder season in many destinations." },
        { season: "Summer", months: "December – February", note: "Longer days; some regions may be hot or rainy." },
        { season: "Autumn", months: "March – May", note: "Can bring milder temperatures and changing foliage." },
        { season: "Winter", months: "June – August", note: "Cooler conditions; ideal for snow destinations." }
      ];
}
