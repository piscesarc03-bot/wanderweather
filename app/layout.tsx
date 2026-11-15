import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WanderWeather — Weather & Destination Guide",
  description: "Explore destination weather, geography, population, currency and travel seasons."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
