import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Kande VendTech | Smart Vending Solutions in Las Vegas",
    template: "%s | Kande VendTech"
  },
  description: "Premier AI-powered smart vending machine services in Las Vegas. $0 cost placement for hotels, offices, and gyms. Fresh healthy options via Kande VendTech.",
  keywords: ["Smart Vending", "Las Vegas Vending", "AI Vending Machines", "Healthy Snacks", "Office Vending", "Hotel Vending"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kandevendtech.com",
    title: "Kande VendTech - Smart Vending for Las Vegas",
    description: "Upgrade your space with AI smart vending. No cost installation, maintenance, and restocking.",
    siteName: "Kande VendTech",
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-background font-sans text-foreground", inter.variable)}>
        {children}
      </body>
    </html>
  );
}
