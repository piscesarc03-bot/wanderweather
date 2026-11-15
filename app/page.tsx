"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, MapPin, Globe2, Users, Coins, CalendarDays, CloudSun, Compass, Plus, X, ChevronDown, Wind, Droplets, Sunrise, Sunset, ThermometerSun, LoaderCircle, Info, ExternalLink } from "lucide-react";
import { Place, DayForecast, weatherIcon, weatherLabel, seasonGuide } from "../lib/weather";

type CountryInfo = {
  name: { common: string; official: string };
  cca2: string;
  capital?: string[];
  region?: string;
  subregion?: string;
  population: number;
  area: number;
  currencies?: Record<string, { name: string; symbol?: string }>;
  languages?: Record<string, string>;
  flags?: { svg?: string; png?: string; alt?: string };
  timezones?: string[];
  continents?: string[];
  borders?: string[];
  maps?: { googleMaps?: string };
};
type WeatherData = {
  current?: {
    time: string; temperature_2m: number; apparent_temperature: number;
    relative_humidity_2m: number; precipitation: number; weather_code: number;
    wind_speed_10m: number; is_day: number;
  };
  daily: {
    time: string[]; weather_code: number[]; temperature_2m_max: number[];
    temperature_2m_min: number[]; precipitation_probability_max?: number[];
    precipitation_sum: number[]; wind_speed_10m_max: number[];
    sunrise?: string[]; sunset?: string[];
  };
  daily_units?: Record<string, string>;
  timezone: string;
};
type ClimateHistory = {
  daily: {
    time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[];
    precipitation_sum: number[];
  };
};
type SearchResult = { id: number; name: string; country?: string; country_code?: string; admin1?: string; latitude: number; longitude: number; timezone?: string; feature_code?: string };

const fmtNumber = (n: number) => new Intl.NumberFormat("en").format(n);
const fmtDate = (date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
const flagEmoji = (code: string) => code ? String.fromCodePoint(...code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0))) : "🌍";

export default function Home() {
  const [place, setPlace] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [climateHistory, setClimateHistory] = useState<ClimateHistory | null>(null);
  const [country, setCountry] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"forecast" | "about" | "travel">("forecast");
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const [unit, setUnit] = useState<"C" | "F">("C");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wanderweather-places");
      if (saved) setSavedPlaces(JSON.parse(saved));
    } catch {}
  }, []);

  async function searchPlaces(e?: FormEvent, searchTerm?: string) {
    e?.preventDefault();
    const term = (searchTerm ?? query).trim();
    if (!term) return;
    if (searchTerm) setQuery(term);
    setSearching(true); setError(""); setShowResults(true); setResults([]);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(term)}&count=8&language=en&format=json`);
      if (!response.ok) throw new Error("Location search is temporarily unavailable.");
      const data = await response.json();
      setResults(data.results || []);
      if (!data.results?.length) setError("No matching places found. Try a city or country name.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not search for that place."); }
    finally { setSearching(false); }
  }

  async function loadPlace(result: SearchResult) {
    const next: Place = {
      id: `${result.id}-${result.latitude}-${result.longitude}`,
      name: result.name, country: result.country || "", countryCode: result.country_code || "",
      latitude: result.latitude, longitude: result.longitude, admin1: result.admin1, timezone: result.timezone
    };
    setPlace(next); setQuery(""); setShowResults(false); setLoading(true); setError(""); setTab("forecast");
    setWeather(null); setClimateHistory(null); setCountry(null);
    try {
      const [wRes, cRes, hRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${next.latitude}&longitude=${next.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset&forecast_days=16&timezone=auto`),
        next.countryCode ? fetch(`https://restcountries.com/v3.1/alpha/${next.countryCode}?fields=name,cca2,capital,region,subregion,population,area,currencies,languages,flags,timezones,continents,borders,maps`) : Promise.resolve(null),
        fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${next.latitude}&longitude=${next.longitude}&start_date=1991-01-01&end_date=2020-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`)
      ]);
      if (!wRes.ok) throw new Error("Could not load the weather forecast. Please try again.");
      const wData = await wRes.json();
      setWeather(wData);
      if (hRes.ok) setClimateHistory(await hRes.json());
      if (cRes?.ok) {
        const cData = await cRes.json();
        setCountry(Array.isArray(cData) ? cData[0] : cData);
      }
      setSavedPlaces(old => {
        const updated = [next, ...old.filter(p => p.id !== next.id)].slice(0, 8);
        localStorage.setItem("wanderweather-places", JSON.stringify(updated));
        return updated;
      });
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  const days: DayForecast[] = useMemo(() => {
    if (!weather) return [];
    return weather.daily.time.map((date, i) => ({
      date, code: weather.daily.weather_code[i], max: weather.daily.temperature_2m_max[i],
      min: weather.daily.temperature_2m_min[i], rain: weather.daily.precipitation_sum[i] || 0,
      wind: weather.daily.wind_speed_10m_max[i] || 0, sunrise: weather.daily.sunrise?.[i], sunset: weather.daily.sunset?.[i]
    }));
  }, [weather]);

  const current = days[0];
  const convert = (v: number) => unit === "C" ? Math.round(v) : Math.round(v * 9 / 5 + 32);
  const currency = country?.currencies ? Object.entries(country.currencies).map(([code, value]) => `${value.name} (${code})${value.symbol ? ` · ${value.symbol}` : ""}`).join(", ") : "Not available";
  const languages = country?.languages ? Object.values(country.languages).join(", ") : "Not available";
  const savedCountries = savedPlaces;

  const climateByMonth = useMemo(() => {
    if (!climateHistory?.daily?.time?.length) return [];
    const buckets: Record<number, { high: number[]; low: number[]; rain: number[] }> = {};
    climateHistory.daily.time.forEach((date, i) => {
      const month = Number(date.slice(5, 7));
      (buckets[month] ||= { high: [], low: [], rain: [] }).high.push(climateHistory.daily.temperature_2m_max[i]);
      buckets[month].low.push(climateHistory.daily.temperature_2m_min[i]);
      buckets[month].rain.push(climateHistory.daily.precipitation_sum[i] || 0);
    });
    return Array.from({ length: 12 }, (_, i) => {
      const b = buckets[i + 1];
      if (!b?.high.length) return null;
      const high = b.high.reduce((a, v) => a + v, 0) / b.high.length;
      const low = b.low.reduce((a, v) => a + v, 0) / b.low.length;
      const rain = b.rain.reduce((a, v) => a + v, 0) / 30;
      const comfort = Math.max(0, 100 - Math.abs(((high + low) / 2) - 22) * 4 - rain * 0.08);
      return { month: new Date(2024, i, 1).toLocaleString("en", { month: "long" }), monthIndex: i + 1, high, low, rain, score: comfort };
    }).filter(Boolean) as { month: string; monthIndex: number; high: number; low: number; rain: number; score: number }[];
  }, [climateHistory]);

  const bestMonths = [...climateByMonth].sort((a, b) => b.score - a.score).slice(0, 3);
  const thirtyDayOutlook = useMemo(() => {
    const actual = days.map(d => ({ ...d, estimate: false }));
    if (!climateHistory?.daily?.time?.length || actual.length >= 30) return actual.slice(0, 30);
    const lookup: Record<string, { high: number[]; low: number[]; rain: number[] }> = {};
    climateHistory.daily.time.forEach((date, i) => {
      const key = date.slice(5);
      (lookup[key] ||= { high: [], low: [], rain: [] }).high.push(climateHistory.daily.temperature_2m_max[i]);
      lookup[key].low.push(climateHistory.daily.temperature_2m_min[i]);
      lookup[key].rain.push(climateHistory.daily.precipitation_sum[i] || 0);
    });
    const result = [...actual];
    const lastDate = actual.length ? new Date(`${actual[actual.length - 1].date}T12:00:00`) : new Date();
    for (let offset = 1; result.length < 30; offset++) {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + offset);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const values = lookup[iso.slice(5)] || lookup[`${iso.slice(5,7)}-28`];
      if (!values?.high.length) continue;
      const mean = (arr: number[]) => arr.reduce((a,v) => a+v,0) / arr.length;
      const high = mean(values.high), low = mean(values.low), rain = mean(values.rain);
      result.push({ date: iso, code: rain > 4 ? 61 : rain > 1 ? 51 : 1, max: high, min: low, rain, wind: 0, estimate: true });
    }
    return result.slice(0,30);
  }, [days, climateHistory]);

  const avgHigh = days.length ? Math.round(days.reduce((sum, d) => sum + d.max, 0) / days.length) : 0;
  const rainDays = days.filter(d => d.rain > 0.5).length;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-icon"><CloudSun size={21}/></span><span>Wander<span>Weather</span></span></a>
        <div className="top-tag"><Compass size={15}/> Weather meets wanderlust</div>
      </header>

      <section className="hero">
        <div className="hero-copy"><div className="eyebrow">YOUR DESTINATION, DECODED</div><h1>Know before<br/><em>you go.</em></h1><p>Explore the forecast, discover the place, and find the season that suits your journey.</p></div>
        <div className="search-panel">
          <label htmlFor="place-search">Where would you like to explore?</label>
          <form className="search-form" onSubmit={searchPlaces}>
            <MapPin size={18}/><input id="place-search" value={query} onChange={e => setQuery(e.target.value)} onFocus={() => results.length && setShowResults(true)} placeholder="Enter a city or country…" />
            <button type="submit" disabled={searching || !query.trim()}>{searching ? <LoaderCircle className="spin" size={17}/> : <Search size={17}/>} <span>Explore</span></button>
          </form>
          {showResults && <div className="results">
            <div className="results-head">SEARCH RESULTS <button onClick={() => setShowResults(false)}><X size={15}/></button></div>
            {results.map(r => <button className="result" key={r.id} onClick={() => loadPlace(r)}><MapPin size={16}/><span><strong>{r.name}</strong><small>{[r.admin1, r.country].filter(Boolean).join(", ")}</small></span><span className="result-arrow">↗</span></button>)}
            {!results.length && !searching && <p className="result-empty">{error || "No results."}</p>}
          </div>}
          <div className="search-hint"><span>Try</span> {["Tokyo", "Paris", "Cape Town", "New Zealand"].map((city) => <button type="button" key={city} onClick={() => searchPlaces(undefined, city)}>{city}</button>)}</div>
          {showResults && <div className="search-instruction">Choose a matching city or country below to load its weather, 30-day outlook, best travel months, currency and population.</div>}
          {error && !showResults && <div className="error-message">{error}</div>}
        </div>
        <div className="hero-orb orb-one"></div><div className="hero-orb orb-two"></div>
      </section>

      <div className="page-content">
        {savedCountries.length > 0 && <section className="saved-strip"><span className="saved-label">RECENTLY EXPLORED</span>{savedCountries.map(p => <button key={p.id} onClick={() => loadPlace({ id: Number(p.id.split("-")[0]) || 1, name: p.name, country: p.country, country_code: p.countryCode, latitude: p.latitude, longitude: p.longitude, admin1: p.admin1, timezone: p.timezone })}>{flagEmoji(p.countryCode)} {p.name}</button>)}</section>}

        {!place && <section className="empty-hero"><div className="empty-illustration"><div className="sun"></div><div className="cloud cloud-a"></div><div className="cloud cloud-b"></div><div className="hill"></div></div><div className="eyebrow">A WORLD OF POSSIBILITIES</div><h2>Your next destination starts here.</h2><p>Search for a city or country above, then select one of the matching results. WanderWeather will load its current weather, 30-day outlook, best travel months, currency, population and geographical facts.</p><div className="empty-feature-list"><span>☀️ Current weather</span><span>📅 30-day outlook</span><span>✈️ Best time to visit</span><span>🌍 Country facts & currency</span></div></section>}

        {place && <div className="destination">
          <div className="destination-heading">
            <div><div className="eyebrow">DESTINATION OVERVIEW</div><h2>{flagEmoji(place.countryCode)} {place.name}{place.country && <span>, {place.country}</span>}</h2><p><MapPin size={14}/> {[place.admin1, place.country].filter(Boolean).join(", ")} <span className="dot">·</span> {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°</p></div>
            <button className="change-place" onClick={() => { setPlace(null); setWeather(null); }}>＋ Add another place</button>
          </div>

          {loading && <div className="loading-card"><LoaderCircle className="spin" size={25}/> Gathering destination details and forecast…</div>}
          {!loading && current && <>
            <div className="current-weather">
              <div className="current-left"><div className="eyebrow">CURRENT WEATHER IN {place.name.toUpperCase()}</div><div className="current-main"><span className="weather-emoji">{weatherIcon(weather?.current?.weather_code ?? current.code)}</span><strong>{convert(weather?.current?.temperature_2m ?? current.max)}°<small> feels {convert(weather?.current?.apparent_temperature ?? current.min)}°{unit}</small></strong></div><div className="current-condition">{weatherLabel(weather?.current?.weather_code ?? current.code)}</div><div className="current-date">{weather?.current?.time ? new Date(weather.current.time).toLocaleString([], { weekday:"long", day:"numeric", month:"long", hour:"2-digit", minute:"2-digit", timeZone:weather.timezone }) : fmtDate(current.date)}</div></div>
              <div className="current-divider"></div>
              <div className="weather-metrics"><div><ThermometerSun/><span>Humidity</span><strong>{weather?.current?.relative_humidity_2m ?? "—"}%</strong></div><div><Droplets/><span>Precipitation</span><strong>{weather?.current?.precipitation ?? "—"} mm</strong></div><div><Wind/><span>Wind now</span><strong>{Math.round(weather?.current?.wind_speed_10m ?? current.wind)} km/h</strong></div></div>
              <div className="unit-toggle"><button className={unit === "C" ? "active" : ""} onClick={() => setUnit("C")}>°C</button><button className={unit === "F" ? "active" : ""} onClick={() => setUnit("F")}>°F</button></div>
            </div>

            <div className="quick-facts">
              <article><div className="fact-icon"><Users/></div><span>Country population</span><strong>{country ? fmtNumber(country.population) : "Loading…"}</strong></article>
              <article><div className="fact-icon"><Coins/></div><span>Local currency</span><strong>{currency}</strong></article>
              <article><div className="fact-icon"><CalendarDays/></div><span>Best time to visit</span><strong>{bestMonths.length ? bestMonths.map(m => m.month.slice(0,3)).join(" · ") : "Loading climate data…"}</strong></article>
            </div>

            <nav className="tabs"><button className={tab === "forecast" ? "active" : ""} onClick={() => setTab("forecast")}><CloudSun size={16}/> Weather forecast</button><button className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}><Globe2 size={16}/> Geography & facts</button><button className={tab === "travel" ? "active" : ""} onClick={() => setTab("travel")}><CalendarDays size={16}/> Travel seasons</button></nav>

            {tab === "forecast" && <section className="tab-content">
              <div className="section-heading"><div><div className="eyebrow">30-DAY WEATHER PLANNER</div><h3>Weather outlook for the next 30 days</h3><p>Daily conditions, temperature range and precipitation.</p></div><span className="live-chip"><span></span> Updated on search</span></div>
              <div className="forecast-grid">{thirtyDayOutlook.map((d, index) => <article className={`forecast-day ${d.date === current.date ? "today" : ""} ${d.estimate ? "estimated-day" : ""}`} key={d.date}><div className="forecast-date">{d.date === current.date ? "Today" : fmtDate(d.date)}</div><div className="forecast-icon">{weatherIcon(d.code)}</div><div className="forecast-condition">{d.estimate ? "Climate average" : weatherLabel(d.code)}</div><div className="forecast-temps"><strong>{convert(d.max)}°</strong><span>{convert(d.min)}°</span></div><div className="forecast-extra"><span><Droplets size={12}/>{d.rain.toFixed(1)} mm</span><span>{d.estimate ? "Historical" : <><Wind size={12}/>{Math.round(d.wind)} km/h</>}</span></div></article>)}</div>
              <div className="forecast-note"><Info size={16}/><span><strong>Forecast accuracy:</strong> The first {days.length} days are live weather forecasts. Days after that are historical climate averages for the same calendar dates (1991–2020), not a day-by-day prediction. Use them as a planning guide, not a guaranteed forecast.</span></div>
              <div className="sun-times"><div><Sunrise/><span>Sunrise</span><strong>{current.sunrise ? new Date(current.sunrise).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit", timeZone: weather?.timezone}) : "—"}</strong></div><div><Sunset/><span>Sunset</span><strong>{current.sunset ? new Date(current.sunset).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit", timeZone: weather?.timezone}) : "—"}</strong></div><div><Globe2/><span>Local time zone</span><strong>{weather?.timezone || place.timezone || "—"}</strong></div></div>
            </section>}

            {tab === "about" && <section className="tab-content">
              <div className="section-heading"><div><div className="eyebrow">GET TO KNOW THE PLACE</div><h3>Geography & country facts</h3><p>Useful context for planning your visit.</p></div></div>
              <div className="facts-grid">
                <div className="fact-card"><div className="fact-icon"><Users/></div><span>Population</span><strong>{country ? fmtNumber(country.population) : "Loading…"}</strong><small>Country-wide estimate</small></div>
                <div className="fact-card"><div className="fact-icon"><Coins/></div><span>Currency</span><strong>{currency}</strong><small>Official currency</small></div>
                <div className="fact-card"><div className="fact-icon"><Globe2/></div><span>Region</span><strong>{country?.region || "—"}</strong><small>{country?.subregion || "Geographical region"}</small></div>
                <div className="fact-card"><div className="fact-icon"><Compass/></div><span>Area</span><strong>{country ? `${fmtNumber(country.area)} km²` : "Loading…"}</strong><small>Country land area</small></div>
                <div className="fact-card"><div className="fact-icon"><MapPin/></div><span>Capital</span><strong>{country?.capital?.join(", ") || "Not listed"}</strong><small>Capital city</small></div>
                <div className="fact-card"><div className="fact-icon"><Globe2/></div><span>Languages</span><strong>{languages}</strong><small>Official / listed languages</small></div>
              </div>
              <div className="geo-card"><div><div className="eyebrow">LOCATION</div><h4>{place.name} coordinates</h4><p>Latitude {place.latitude.toFixed(4)}° · Longitude {place.longitude.toFixed(4)}°</p><p>{country?.continents?.join(", ") || place.country} {country?.timezones?.length ? `· ${country.timezones.length} listed time zone(s)` : ""}</p>{country?.maps?.googleMaps && <a href={country.maps.googleMaps} target="_blank" rel="noreferrer">Open on Google Maps <ExternalLink size={13}/></a>}</div><div className="coordinate-art"><Globe2 size={72}/><span>{place.latitude >= 0 ? "Northern" : "Southern"} Hemisphere</span></div></div>
              <div className="source-note">Country facts from REST Countries. City coordinates and place names from Open-Meteo Geocoding.</div>
            </section>}

            {tab === "travel" && <section className="tab-content">
              <div className="section-heading"><div><div className="eyebrow">CLIMATE-BASED TRAVEL PLANNING</div><h3>Best time to visit {place.name}</h3><p>Ranked using 1991–2020 historical monthly temperature and rainfall patterns.</p></div></div>
              {bestMonths.length > 0 ? <div className="best-months">{bestMonths.map((m, i) => <article className="best-month-card" key={m.month}><span className="rank-label">#{i+1} RECOMMENDED</span><h4>{m.month}</h4><strong>{convert(m.low)}°–{convert(m.high)}°{unit}</strong><p>Average monthly rainfall: {Math.round(m.rain)} mm</p><div className="score-track"><span style={{width:`${Math.max(5, Math.min(100,m.score))}%`}}/></div><small>Comfort score: {Math.round(m.score)}/100</small></article>)}</div> : <div className="loading-card">Loading historical climate averages…</div>}
              <div className="season-callout"><div className="season-symbol">✦</div><div><strong>How the recommendation works</strong><p>The app compares historical monthly average temperatures and rainfall, favouring milder temperatures and lower rainfall. This is a general climate-based guide; local festivals, monsoon timing, altitude and personal preferences can change the best travel window.</p></div></div>
              <h3 className="subsection-title">Season calendar</h3>
              <div className="season-grid">{seasonGuide(place.latitude).map((s, i) => <article className="season-card" key={s.season}><div className={`season-art season-${s.season.toLowerCase()}`}>{["🌸","☀️","🍂","❄️"][i]}</div><div><span>SEASON {String(i+1).padStart(2,"0")}</span><h4>{s.season}</h4><strong>{s.months}</strong><p>{s.note}</p></div></article>)}</div>
              <div className="forecast-note"><Info size={16}/><span><strong>Travel advice:</strong> These are historical climate patterns, not a guarantee of future weather. Tropical destinations may be better planned around wet/dry seasons and local monsoon calendars.</span></div>
            </section>}
          </>}
        </div>}
        <footer className="footer"><span>WanderWeather</span><span>Explore thoughtfully. Travel well.</span><span>Weather data: Open-Meteo · Country data: REST Countries</span></footer>
      </div>
    </main>
  );
}
