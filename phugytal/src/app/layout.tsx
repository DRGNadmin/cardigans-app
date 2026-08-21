import type { Metadata } from "next";
import { Caveat, Montserrat, Oswald } from "next/font/google";
import { FygitalBg } from "@/components/FygitalBg";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin", "cyrillic"],
  variable: "--font-oswald",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Чемпионат России по фиджитал спорту",
  description:
    "Информационный сайт для зрителей: сетки и расписание дисциплин фиджитал чемпионата.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${montserrat.variable} ${oswald.variable} ${caveat.variable} antialiased`}
        style={
          {
            ["--font-body" as string]:
              "var(--font-montserrat), system-ui, sans-serif",
            ["--font-display" as string]: "var(--font-oswald), sans-serif",
            ["--font-hand" as string]: "var(--font-caveat), cursive",
          } as React.CSSProperties
        }
        suppressHydrationWarning
      >
        <FygitalBg />
        {children}
      </body>
    </html>
  );
}
