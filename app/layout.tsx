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
  title: "Neurix — Ideas & Tasks | AI-powered team management",
  description: "Capture your ideas and manage team tasks with AI assistance. Smart collaboration, better productivity.",
  keywords: ["neurix", "agenda", "tasks", "project management", "collaboration", "team", "AI"],
  authors: [{ name: "Neurix" }],
  icons: {
    icon: "/logo (1).png",
  },
  openGraph: {
    title: "Neurix — Ideas & Tasks",
    description: "Capture your ideas and manage team tasks with AI assistance",
    url: "https://neurix.qrthecode2.com",
    siteName: "Neurix",
    images: [
      {
        url: "/logo (1).png",
        width: 1200,
        height: 630,
        alt: "Neurix - Task management",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neurix — Ideas & Tasks",
    description: "Capture your ideas and manage team tasks with AI assistance",
    images: ["/logo (1).png"],
  },
  alternates: {
    canonical: "https://neurix.qrthecode2.com",
    languages: {
      "fr-FR": "https://neurix.qrthecode2.com",
      "en-US": "https://neurix.qrthecode2.com",
    },
    media: {
      "image": "https://neurix.qrthecode2.com/logo.png",
    },
    types: {
      "application/json": "https://neurix.qrthecode2.com/sitemap.xml",
    },
  },
  other: {
    "google-adsense-account": "ca-pub-3501392384261622",
  },
  // Code fourni par AdSense / Search Console (balise meta google-site-verification)
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
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
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <StructuredData />
      </head>
      <body
        className="min-h-dvh flex flex-col overflow-x-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
