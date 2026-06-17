import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { StatusPanel } from "@/components/status-panel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "АвтоТренажёр — Тренировка продаж китайских авто",
  description:
    "Голосовой тренажёр для продавцов-консультантов автосалонов китайских автомобилей. Практика телефонных переговоров с виртуальным клиентом.",
  keywords: [
    "тренировка продаж",
    "китайские авто",
    "автосалон",
    "продавец-консультант",
    "Haval",
    "Chery",
    "Geely",
    "Changan",
    "Tank",
  ],
  authors: [{ name: "АвтоТренажёр" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <StatusPanel />
      </body>
    </html>
  );
}
