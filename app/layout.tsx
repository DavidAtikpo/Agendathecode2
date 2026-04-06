import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StructuredData from "./components/StructuredData";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agenda — Idées & Tâches | Gestion d'équipe alimentée par l'IA",
  description: "Capturez vos idées et gérez vos tâches en équipe avec l'aide de l'IA. Collaboration intelligente, productivité accrue.",
  keywords: ["agenda", "tâches", "gestion de projet", "collaboration", "équipe", "IA"],
  authors: [{ name: "Agenda" }],
  icons: {
    icon: "/logo (1).jpg",
  },
  openGraph: {
    title: "Agenda — Idées & Tâches",
    description: "Capturez vos idées et gérez vos tâches en équipe avec l'aide de l'IA",
    url: "https://agenda.example.com",
    siteName: "Agenda",
    images: [
      {
        url: "/logo (1).jpg",
        width: 1200,
        height: 630,
        alt: "Agenda - Gestion de tâches",
      },
    ],
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agenda — Idées & Tâches",
    description: "Capturez vos idées et gérez vos tâches en équipe avec l'aide de l'IA",
    images: ["/logo (1).jpg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const robots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <StructuredData />
      </head>
      <body className="min-h-dvh flex flex-col overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
