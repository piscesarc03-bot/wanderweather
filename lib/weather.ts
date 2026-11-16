
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

export type SearchResult = {
  id: number;
  name: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

export type DayForecast = {
  date: string;
  code: number;
  max: number;
  min: number;
  rain: number;
  wind: number;
  rainProbability?: number;
  sunrise?: string;
  sunset?: string;
};

export type WeatherData = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  timezone: string;
};

export type ClimateHistory = {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
};

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const CLIMATE_API = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODING_API = "https://geocoding-api.open-meteo.com/v1/search";

// Search Indian cities only
export async function searchIndianCities(
  query: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const params = new URLSearchParams({
    name: query,
    count: "10",
    language: "en",
    format: "json",
  });

  const response = await fetch(
    `${GEOCODING_API}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("City search is temporarily unavailable.");
  }

  const data = await response.json();

  return (data.results || []).filter(
    (city: SearchResult) => city.country_code === "IN"
  );
}

// Fetch current weather and the next 10 days
export async function fetchWeather(
  place: Place
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset",
    forecast_days: "10",
    timezone: "auto",
  });

  const response = await fetch(
    `${WEATHER_API}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Unable to load weather. Please try again.");
  }

  return response.json();
}

// Fetch historical climate data separately
export async function fetchClimateHistory(
  place: Place
): Promise<ClimateHistory> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    start_date: "1991-01-01",
    end_date: "2020-12-31",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
  });

  const response = await fetch(
    `${CLIMATE_API}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Historical climate data is unavailable.");
  }

  return response.json();
}

// Weather descriptions
export function weatherLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if ([1, 2].includes(code)) return "Mainly clear";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return "Snow";
  if ([95, 96, 99].includes(code))
    return "Thunderstorm";

  return "Variable conditions";
}

// Weather icons
export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code))
    return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
  return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return "❄️";
  if ([95, 96, 99].includes(code))
    return "⛈️";

  return "🌡️";
}

// Basic seasonal guidance; historical climate
// recommendations will be calculated separately.
export function seasonGuide(latitude: number) {
  return [
    {
      season: "Summer",
      months: "March – May",
      note: "Generally warmer conditions across much of India.",
    },
    {
      season: "Monsoon",
      months: "June – September",
      note: "Rainfall varies significantly by region.",
    },
    {
      season: "Post-monsoon",
      months: "October – November",
      note: "Conditions begin to change after the monsoon.",
    },
    {
      season: "Winter",
      months: "December – February",
      note: "Generally cooler, especially in northern India.",
    },
  ];
}
