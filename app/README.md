# WanderWeather — Weather & Destination Guide

A responsive destination weather explorer built with Next.js, React and TypeScript. Designed for GitHub + Vercel deployment.

## Features

- Search cities and countries using Open-Meteo Geocoding
- Current conditions plus a 30-day planning outlook (up to 16 live forecast days, followed by historical daily climate averages)
- Temperature in Celsius or Fahrenheit
- Rainfall, wind, sunrise and sunset details
- Country population, currencies, languages, region, area and capital
- Coordinates and hemisphere information
- Best-month recommendations ranked from 1991–2020 historical monthly temperature and rainfall patterns, plus a hemisphere season calendar
- Recently explored destinations saved in browser local storage
- Responsive desktop and mobile UI

## Important forecast limitation

The app does **not** fabricate a 30-day daily forecast. The free Open-Meteo forecast endpoint currently provides up to 16 forecast days. The UI clearly identifies this and provides general season information for longer-range trip planning. Seasonal guidance is a broad hemisphere-based calendar, not a destination-specific ranking of the best months. Tropical and monsoon climates need more detailed local climate data.

## Data sources

- Weather and geocoding: Open-Meteo (https://open-meteo.com/)\n- Historical climate averages: Open-Meteo Archive API (1991–2020)
- Country facts: REST Countries (https://restcountries.com/)

No API keys are required for this starter version. Please review each provider's current terms and attribution requirements before public/commercial use.

## Run locally

Requires Node.js 20 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Create a GitHub repository, for example `wanderweather`.
2. Upload/push the contents of this folder to the repository root.
3. In Vercel, choose **Add New → Project** and import the GitHub repository.
4. Keep the framework preset as **Next.js**. No environment variables are needed.
5. Deploy. Subsequent pushes to the connected branch trigger deployments.

## Project structure

```text
weather-explorer/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   └── weather.ts
├── .gitignore
├── next.config.ts
├── next-env.d.ts
├── package.json
└── tsconfig.json
```

## Ideas for a future version

- Add 30-day climate normals and monthly rainfall/temperature charts
- Add a destination comparison view
- Add saved travel itineraries and trip dates
- Add user accounts and cloud-synced saved destinations
- Add country-specific best-month recommendations based on monthly climate averages


## Build troubleshooting

The app imports the weather helpers using a relative path (`../lib/weather`) so the build does not depend on resolving the `@/` alias. The TypeScript config also sets `baseUrl` to the project root.
