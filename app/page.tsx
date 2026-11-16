
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapPin, CloudSun, Sun, Droplets, Wind,
  ThermometerSun, CalendarDays, Navigation,
  LoaderCircle, CloudRain, Search
} from "lucide-react";

import {
  Place,
  WeatherData,
  ClimateHistory,
  fetchWeather,
  fetchClimateHistory,
  weatherIcon,
  weatherLabel
} from "../lib/weather";

// Indian cities with fixed coordinates.
// No external geocoding or city-search API required.

const CITIES: Place[] = [
  {
    id: "bengaluru",
    name: "Bengaluru",
    country: "India",
    countryCode: "IN",
    admin1: "Karnataka",
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: "Asia/Kolkata"
  },
  {
    id: "mumbai",
    name: "Mumbai",
    country: "India",
    countryCode: "IN",
    admin1: "Maharashtra",
    latitude: 19.0760,
    longitude: 72.8777,
    timezone: "Asia/Kolkata"
  },
  {
    id: "delhi",
    name: "New Delhi",
    country: "India",
    countryCode: "IN",
    admin1: "Delhi",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: "Asia/Kolkata"
  },
  {
    id: "hyderabad",
    name: "Hyderabad",
    country: "India",
    countryCode: "IN",
    admin1: "Telangana",
    latitude: 17.3850,
    longitude: 78.4867,
    timezone: "Asia/Kolkata"
  },
  {
    id: "chennai",
    name: "Chennai",
    country: "India",
    countryCode: "IN",
    admin1: "Tamil Nadu",
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: "Asia/Kolkata"
  }
];

const NEARBY_PLACES: Record<
  string,
  { name: string; category: string; description: string }[]
> = {
  bengaluru: [
    {
      name: "Lalbagh Botanical Garden",
      category: "Nature",
      description: "Famous botanical garden and glass house."
    },
    {
      name: "Bangalore Palace",
      category: "History",
      description: "Historic palace with Tudor-style architecture."
    },
    {
      name: "Cubbon Park",
      category: "Nature",
      description: "Popular green space in central Bengaluru."
    },
    {
      name: "ISKCON Temple",
      category: "Culture",
      description: "Well-known temple and cultural attraction."
    }
  ],
  mumbai: [
    {
      name: "Gateway of India",
      category: "History",
      description: "Iconic waterfront monument."
    },
    {
      name: "Marine Drive",
      category: "Scenic",
      description: "Famous seaside promenade."
    },
    {
      name: "Elephanta Caves",
      category: "History",
      description: "Historic rock-cut cave temples."
    },
    {
      name: "Juhu Beach",
      category: "Beach",
      description: "Popular beach and street-food destination."
    }
  ],
  delhi: [
    {
      name: "India Gate",
      category: "History",
      description: "National war memorial and landmark."
    },
    {
      name: "Red Fort",
      category: "History",
      description: "Historic Mughal-era fort."
    },
    {
      name: "Qutub Minar",
      category: "History",
      description: "UNESCO-listed historic monument."
    },
    {
      name: "Lotus Temple",
      category: "Culture",
      description: "Distinctive lotus-shaped architectural landmark."
    }
  ],
  hyderabad: [
    {
      name: "Charminar",
      category: "History",
      description: "Historic monument in the old city."
    },
    {
      name: "Golconda Fort",
      category: "History",
      description: "Historic fort and panoramic viewpoints."
    },
    {
      name: "Hussain Sagar",
      category: "Scenic",
      description: "Lake with a famous Buddha statue."
    },
    {
      name: "Salar Jung Museum",
      category: "Culture",
      description: "Museum with a diverse art collection."
    }
  ],
  chennai: [
    {
      name: "Marina Beach",
      category: "Beach",
      description: "One of India's best-known urban beaches."
    },
    {
      name: "Kapaleeshwarar Temple",
      category: "Culture",
      description: "Historic Dravidian-style temple."
    },
    {
      name: "Fort St. George",
      category: "History",
      description: "Historic British-era fort."
    },
    {
      name: "Government Museum",
      category: "Culture",
      description: "Museum featuring art and archaeology."
    }
  ]
};

const cardStyle = {
  background: "#ffffff",
  border: "1px solid #e8eaf0",
  borderRadius: "16px",
  padding: "20px",
  color: "#26344a"
};

const headingStyle = {
  color: "#182d4c",
  fontWeight: 700 as const
};

function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString(
    "en-IN",
    { weekday: "short", day: "numeric", month: "short" }
  );
}

export default function Home() {
  const [cityId, setCityId] = useState("bengaluru");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [climate, setClimate] = useState<ClimateHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [climateError, setClimateError] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");

  const city = CITIES.find(c => c.id === cityId)!;

  const convert = (value: number) =>
    unit === "C"
      ? Math.round(value)
      : Math.round(value * 9 / 5 + 32);

  // Load weather and climate independently.
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");
      setClimateError("");
      setWeather(null);
      setClimate(null);

      const [weatherResult, climateResult] =
        await Promise.allSettled([
          fetchWeather(city),
          fetchClimateHistory(city)
        ]);

      if (cancelled) return;

      if (weatherResult.status === "fulfilled") {
        setWeather(weatherResult.value);
      } else {
        setError(
          weatherResult.reason instanceof Error
            ? weatherResult.reason.message
            : "Unable to load weather."
        );
      }

      if (climateResult.status === "fulfilled") {
        setClimate(climateResult.value);
      } else {
        setClimateError("Historical climate data is temporarily unavailable.");
      }

      setLoading(false);
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [city]);

  // Calculate historical monthly climate averages.
  const bestMonths = useMemo(() => {
    if (!climate?.daily?.time?.length) return [];

    const buckets: Record<
      number,
      Record<number, { high: number[]; low: number[]; rain: number }>
    > = {};

    climate.daily.time.forEach((date, i) => {
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(5, 7));

      if (!buckets[month]) buckets[month] = {};

      if (!buckets[month][year]) {
        buckets[month][year] = {
          high: [],
          low: [],
          rain: 0
        };
      }

      const entry = buckets[month][year];

      entry.high.push(climate.daily.temperature_2m_max[i]);
      entry.low.push(climate.daily.temperature_2m_min[i]);
      entry.rain += climate.daily.precipitation_sum[i] || 0;
    });

    return Object.entries(buckets)
      .map(([month, years]) => {
        const monthlyValues = Object.values(years);

        const highs = monthlyValues.flatMap(v => v.high);
        const lows = monthlyValues.flatMap(v => v.low);

        const average = (values: number[]) =>
          values.reduce((sum, value) => sum + value, 0) /
          Math.max(values.length, 1);

        const high = average(highs);
        const low = average(lows);
        const rain = average(monthlyValues.map(v => v.rain));

        const temperature = (high + low) / 2;

        const score = Math.max(
          0,
          100 -
          Math.abs(temperature - 24) * 4 -
          rain * 0.25
        );

        return {
          month: Number(month),
          high,
          low,
          rain,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [climate]);

  const nearbyPlaces = NEARBY_PLACES[cityId] || [];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f7fb",
      padding: "24px",
      color: "#26344a"
    }}>

      {/* HEADER */}

      <header style={{
        maxWidth: "1200px",
        margin: "0 auto 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ ...headingStyle, fontSize: "27px" }}>
          <CloudSun size={27} style={{ verticalAlign: "middle" }} />
          {" "}WanderWeather
        </h1>
        <span style={{ color: "#68758a" }}>
          Explore India. Travel better.
        </span>
      </header>

      <div style={{ maxWidth: "1200px", margin: "auto" }}>

        {/* LOCATION */}

        <section style={{ ...cardStyle, marginBottom: "20px" }}>
          <h2 style={{ ...headingStyle, fontSize: "21px" }}>
            <MapPin size={20} /> Explore Indian destinations
          </h2>

          <p style={{ color: "#718096" }}>
            Select a city to explore its weather and nearby attractions.
          </p>

          <select
            value={cityId}
            onChange={e => setCityId(e.target.value)}
            style={{
              width: "100%",
              maxWidth: "450px",
              padding: "14px",
              border: "1px solid #d7dce7",
              borderRadius: "10px",
              fontSize: "16px",
              background: "#fff"
            }}
          >
            {CITIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.admin1}
              </option>
            ))}
          </select>

          <p style={{ color: "#718096", marginTop: "14px" }}>
            <MapPin size={15} />
            {" "}{city.name}, {city.admin1}, India
          </p>
        </section>

        {loading && (
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
            <LoaderCircle className="spin" size={30} />
            <p>Loading weather and climate information...</p>
          </div>
        )}

        {error && (
          <div style={{
            ...cardStyle,
            color: "#c0392b",
            marginBottom: "20px"
          }}>
            <p>{error}</p>
            <button onClick={() => setCityId(city.id)}>
              Retry
            </button>
          </div>
        )}

        {/* CURRENT WEATHER */}

        {!loading && weather && (
          <>
            <section style={{
              ...cardStyle,
              marginBottom: "20px",
              background: "linear-gradient(120deg,#243b60,#426a91)",
              color: "#fff"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px"
              }}>
                <div>
                  <p>CURRENT WEATHER</p>
                  <h2 style={{ fontSize: "25px" }}>
                    {city.name}
                  </h2>
                  <div style={{ fontSize: "54px", fontWeight: 700 }}>
                    {weatherIcon(weather.current.weather_code)}
                    {" "}{convert(weather.current.temperature_2m)}°
                    {unit}
                  </div>
                  <p>{weatherLabel(weather.current.weather_code)}</p>
                  <p>
                    Feels like {convert(weather.current.apparent_temperature)}°
                    {unit}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                  <div>
                    <ThermometerSun />
                    <p>Humidity</p>
                    <strong>{weather.current.relative_humidity_2m}%</strong>
                  </div>
                  <div>
                    <Droplets />
                    <p>Rain</p>
                    <strong>{weather.current.precipitation} mm</strong>
                  </div>
                  <div>
                    <Wind />
                    <p>Wind</p>
                    <strong>{weather.current.wind_speed_10m} km/h</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "15px" }}>
                <button onClick={() => setUnit("C")}>°C</button>
                {" "}
                <button onClick={() => setUnit("F")}>°F</button>
              </div>
            </section>

            {/* 10 DAY FORECAST */}

            <section style={{ ...cardStyle, marginBottom: "20px" }}>
              <h2 style={headingStyle}>
                <CalendarDays size={20} /> Next 10 Days Weather Forecast
              </h2>

              <p style={{ color: "#718096" }}>
                Actual weather forecast from Open-Meteo.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
                gap: "12px"
              }}>
                {weather.daily.time.map((date, i) => (
                  <article key={date} style={{
                    background: "#f3f6fb",
                    borderRadius: "12px",
                    padding: "15px",
                    textAlign: "center"
                  }}>
                    <strong>{i === 0 ? "Today" : formatDate(date)}</strong>

                    <div style={{ fontSize: "32px", margin: "12px" }}>
                      {weatherIcon(weather.daily.weather_code[i])}
                    </div>

                    <p style={{ fontSize: "13px" }}>
                      {weatherLabel(weather.daily.weather_code[i])}
                    </p>

                    <strong>
                      {convert(weather.daily.temperature_2m_max[i])}°
                    </strong>
                    {" / "}
                    <span>
                      {convert(weather.daily.temperature_2m_min[i])}°
                    </span>

                    <p style={{ fontSize: "13px", color: "#60738b" }}>
                      <Droplets size={13} />
                      {" "}{weather.daily.precipitation_sum[i]} mm
                    </p>

                    <p style={{ fontSize: "12px", color: "#60738b" }}>
                      Rain chance:{" "}
                      {weather.daily.precipitation_probability_max?.[i] ?? "—"}%
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {/* BEST TIME TO VISIT */}

        <section style={{ ...cardStyle, marginBottom: "20px" }}>
          <h2 style={headingStyle}>
            <Sun size={20} /> Best Time to Visit {city.name}
          </h2>

          <p style={{ color: "#718096" }}>
            Historical climate guide based on 1991–2020 data.
            These are climate averages, not weather forecasts.
          </p>

          {climateError && (
            <p style={{ color: "#b45309" }}>{climateError}</p>
          )}

          {bestMonths.length > 0 ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: "15px"
            }}>
              {bestMonths.map((m, i) => (
                <article key={m.month} style={{
                  background: "#eef5f1",
                  padding: "18px",
                  borderRadius: "12px"
                }}>
                  <strong>Recommended #{i + 1}</strong>
                  <h3 style={{ fontSize: "22px", ...headingStyle }}>
                    {new Date(2024, m.month - 1).toLocaleString(
                      "en-IN",
                      { month: "long" }
                    )}
                  </h3>
                  <p>
                    {convert(m.low)}° – {convert(m.high)}°{unit}
                  </p>
                  <p>Average monthly rainfall: {m.rain.toFixed(0)} mm</p>
                </article>
              ))}
            </div>
          ) : (
            !climateError && <p>Loading historical climate information...</p>
          )}
        </section>

        {/* NEARBY PLACES */}

        <section style={{ ...cardStyle, marginBottom: "20px" }}>
          <h2 style={headingStyle}>
            <Navigation size={20} /> Nearby Places to Explore
          </h2>

          <p style={{ color: "#718096" }}>
            Discover popular attractions in and around {city.name}.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "15px"
          }}>
            {nearbyPlaces.map(place => (
              <article key={place.name} style={{
                border: "1px solid #e5e9f0",
                borderRadius: "12px",
                padding: "16px"
              }}>
                <MapPin size={22} color="#6476b8" />

                <h3 style={{ ...headingStyle, marginTop: "10px" }}>
                  {place.name}
                </h3>

                <span style={{ color: "#6476b8", fontSize: "13px" }}>
                  {place.category}
                </span>

                <p style={{ color: "#718096", fontSize: "14px" }}>
                  {place.description}
                </p>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    place.name + ", " + city.name + ", India"
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#5369b1",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  View directions ↗
                </a>
              </article>
            ))}
          </div>
        </section>

        <footer style={{
          textAlign: "center",
          padding: "25px",
          color: "#718096",
          fontSize: "13px"
        }}>
          WanderWeather · Explore thoughtfully. Travel well.
          <br />
          Weather: Open-Meteo · Historical climate: Open-Meteo Archive
        </footer>

      </div>
    </main>
  );
}
