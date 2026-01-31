import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL("https://kandevendtech.com"),
  title: {
    default: "Kande VendTech | Smart Vending Machines Las Vegas | Free Installation",
    template: "%s | Kande VendTech"
  },
  description: "Premier AI-powered smart vending machine services in Las Vegas. Free installation, restocking & maintenance for hotels, offices, apartments & gyms. 40,000+ product options.",
  keywords: [
    "vending machines las vegas",
    "smart vending las vegas",
    "vending machine service las vegas",
    "AI vending machines las vegas",
    "vending machine rental las vegas",
    "office vending machine las vegas",
    "apartment vending machine las vegas",
    "free vending machine las vegas",
    "vending machine company las vegas",
    "micro market las vegas",
    "smart vending solutions",
    "healthy vending las vegas",
    "hotel vending machine las vegas",
    "gym vending machine las vegas",
    "breakroom vending service",
    "cashless vending machines",
    "touchscreen vending machine",
    "vending machine installation las vegas",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kandevendtech.com",
    title: "Kande VendTech | Smart Vending Machines for Las Vegas",
    description: "Free AI-powered smart vending machines for Las Vegas businesses. Zero cost installation, restocking & maintenance. 40,000+ snack, meal & beverage options.",
    siteName: "Kande VendTech",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kande VendTech - Smart Vending Machines Las Vegas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kande VendTech | Smart Vending Machines Las Vegas",
    description: "Free AI-powered smart vending machines for Las Vegas businesses. Zero cost installation & full service.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://kandevendtech.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans text-foreground", inter.variable)}>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
