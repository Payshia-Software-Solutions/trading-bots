import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "600", "800"]
});

export const metadata = {
  title: "Crypto Analyzer - Premium Web Platform",
  description: "AI powered Crypto Technical Analysis and Signals",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Crypto Analyzer",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

import Providers from './Providers';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="dark">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
