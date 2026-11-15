"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, MapPin, Globe2, Users, Coins, CalendarDays, CloudSun, Compass, Plus, X, ChevronDown, Wind, Droplets, Sunrise, Sunset, ThermometerSun, LoaderCircle, Info, ExternalLink } from "lucide-react";
import { Place, DayForecast, weatherIcon, weatherLabel, seasonGuide } from "@/lib/weather";

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
  daily: {
    time: string[]; weather_code: number[]; temperature_2m_max: number[];
    temperature_2m_min: number[]; precipitation_probability_max?: number[];
    precipitation_sum: number[]; wind_speed_10m_max: number[];
    sunrise?: string[]; sunset?: string[];
  };
  daily_units?: Record<string, string>;
  timezone: string;
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

  async function searchPlaces(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(""); setShowResults(true);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`);
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
    setWeather(null); setCountry(null);
    try {
      const [wRes, cRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${next.latitude}&longitude=${next.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset&forecast_days=16&timezone=auto`),
        next.countryCode ? fetch(`https://restcountries.com/v3.1/alpha/${next.countryCode}?fields=name,cca2,capital,region,subregion,population,area,currencies,languages,flags,timezones,continents,borders,maps`) : Promise.resolve(null)
      ]);
      if (!wRes.ok) throw new Error("Could not load the weather forecast. Please try again.");
      const wData = await wRes.json();
      setWeather(wData);
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
  const avgHigh = days.length ? Math.round(days.reduce((s, d) => s + d.max, 0) / days.length) : 0;
  const rainDays = days.filter(d => d.rain > 0.5).length;
  const convert = (v: number) => unit === "C" ? Math.round(v) : Math.round(v * 9 / 5 + 32);
  const currency = country?.currencies ? Object.entries(country.currencies).map(([code, value]) => `${value.name} (${code})${value.symbol ? ` · ${value.symbol}` : ""}`).join(", ") : "Not available";
  const languages = country?.languages ? Object.values(country.languages).join(", ") : "Not available";
  const savedCountries = savedPlaces;

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
          <div className="search-hint"><span>Try</span> Tokyo · Paris · Cape Town · New Zealand</div>
          {error && !showResults && <div className="error-message">{error}</div>}
        </div>
        <div className="hero-orb orb-one"></div><div className="hero-orb orb-two"></div>
      </section>

      <div className="page-content">
        {savedCountries.length > 0 && <section className="saved-strip"><span className="saved-label">RECENTLY EXPLORED</span>{savedCountries.map(p => <button key={p.id} onClick={() => loadPlace({ id: Number(p.id.split("-")[0]) || 1, name: p.name, country: p.country, country_code: p.countryCode, latitude: p.latitude, longitude: p.longitude, admin1: p.admin1, timezone: p.timezone })}>{flagEmoji(p.countryCode)} {p.name}</button>)}</section>}

        {!place && <section className="empty-hero"><div className="empty-illustration"><div className="sun"></div><div className="cloud cloud-a"></div><div className="cloud cloud-b"></div><div className="hill"></div></div><div className="eyebrow">A WORLD OF POSSIBILITIES</div><h2>Your next destination starts here.</h2><p>Search for a city or country above to see its weather forecast, geographical profile, local currency and seasonal travel guide.</p></section>}

        {place && <div className="destination">
          <div className="destination-heading">
            <div><div className="eyebrow">DESTINATION OVERVIEW</div><h2>{flagEmoji(place.countryCode)} {place.name}{place.country && <span>, {place.country}</span>}</h2><p><MapPin size={14}/> {[place.admin1, place.country].filter(Boolean).join(", ")} <span className="dot">·</span> {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°</p></div>
            <button className="change-place" onClick={() => { setPlace(null); setWeather(null); }}>＋ Add another place</button>
          </div>

          {loading && <div className="loading-card"><LoaderCircle className="spin" size={25}/> Gathering destination details and forecast…</div>}
          {!loading && current && <>
            <div className="current-weather">
              <div className="current-left"><div className="eyebrow">TODAY IN {place.name.toUpperCase()}</div><div className="current-main"><span className="weather-emoji">{weatherIcon(current.code)}</span><strong>{convert(current.max)}°<small>/{convert(current.min)}°{unit}</small></strong></div><div className="current-condition">{weatherLabel(current.code)}</div><div className="current-date">{fmtDate(current.date, { weekday: "long", day: "numeric", month: "long" })}</div></div>
              <div className="current-divider"></div>
              <div className="weather-metrics"><div><ThermometerSun/><span>16-day avg high</span><strong>{convert(avgHigh)}°{unit}</strong></div><div><Droplets/><span>Rainy days</span><strong>{rainDays} days</strong></div><div><Wind/><span>Max wind today</span><strong>{Math.round(current.wind)} km/h</strong></div></div>
              <div className="unit-toggle"><button className={unit === "C" ? "active" : ""} onClick={() => setUnit("C")}>°C</button><button className={unit === "F" ? "active" : ""} onClick={() => setUnit("F")}>°F</button></div>
            </div>

            <nav className="tabs"><button className={tab === "forecast" ? "active" : ""} onClick={() => setTab("forecast")}><CloudSun size={16}/> Weather forecast</button><button className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}><Globe2 size={16}/> Geography & facts</button><button className={tab === "travel" ? "active" : ""} onClick={() => setTab("travel")}><CalendarDays size={16}/> Travel seasons</button></nav>

            {tab === "forecast" && <section className="tab-content">
              <div className="section-heading"><div><div className="eyebrow">UP TO 16 DAYS</div><h3>Daily weather forecast</h3><p>Temperature, rain and wind at a glance.</p></div><span className="live-chip"><span></span> Live forecast</span></div>
              <div className="forecast-grid">{days.map(d => <article className={`forecast-day ${d.date === current.date ? "today" : ""}`} key={d.date}><div className="forecast-date">{d.date === current.date ? "Today" : fmtDate(d.date)}</div><div className="forecast-icon">{weatherIcon(d.code)}</div><div className="forecast-condition">{weatherLabel(d.code)}</div><div className="forecast-temps"><strong>{convert(d.max)}°</strong><span>{convert(d.min)}°</span></div><div className="forecast-extra"><span><Droplets size={12}/>{d.rain.toFixed(1)} mm</span><span><Wind size={12}/>{Math.round(d.wind)} km/h</span></div></article>)}</div>
              <div className="forecast-note"><Info size={16}/><span><strong>About the one-month view:</strong> Reliable daily forecasts are generally available for up to 16 days from this weather provider. This app shows all available daily forecast days rather than inventing predictions for the rest of the month. The destination and travel-season information can help with longer-range planning.</span></div>
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
              <div className="section-heading"><div><div className="eyebrow">PLAN THE RIGHT SEASON</div><h3>Seasons & travel timing</h3><p>Season dates are based on the destination’s hemisphere.</p></div></div>
              <div className="season-callout"><div className="season-symbol">✦</div><div><strong>{place.latitude >= 0 ? "Northern Hemisphere" : "Southern Hemisphere"}</strong><p>{place.latitude >= 0 ? "Season months follow the northern hemisphere calendar." : "Season months are reversed compared with the northern hemisphere."} Local climate can vary significantly by altitude, coast and region.</p></div></div>
              <div className="season-grid">{seasonGuide(place.latitude).map((s, i) => <article className="season-card" key={s.season}><div className={`season-art season-${s.season.toLowerCase()}`}>{["🌸","☀️","🍂","❄️"][i]}</div><div><span>SEASON {String(i+1).padStart(2,"0")}</span><h4>{s.season}</h4><strong>{s.months}</strong><p>{s.note}</p></div></article>)}</div>
              <div className="forecast-note"><Info size={16}/><span><strong>Travel advice:</strong> These are general astronomical seasons, not a destination-specific climate ranking. For tropical destinations, monsoon, dry-season and regional weather patterns may matter more than the four-season calendar. Check local guidance before booking.</span></div>
            </section>}
          </>}
        </div>}
        <footer className="footer"><span>WanderWeather</span><span>Explore thoughtfully. Travel well.</span><span>Weather data: Open-Meteo · Country data: REST Countries</span></footer>
      </div>
    </main>
  );
}
