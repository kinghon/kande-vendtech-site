import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import {
  TrustStats,
  ValueProps,
  SmartTechnology,
  BusinessBenefits,
  LocalFocus,
  HowItWorks,
  CTASection,
} from "@/components/home/AnimatedSections";
import { FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Smart Vending Machines Las Vegas | Free Installation | Kande VendTech",
  description:
    "Get free AI-powered smart vending machines for your Las Vegas business. Zero cost installation, restocking & maintenance for hotels, offices, apartments & gyms. 40,000+ products.",
  alternates: {
    canonical: "https://kandevendtech.com",
  },
  openGraph: {
    title: "Smart Vending Machines Las Vegas | Free Installation | Kande VendTech",
    description:
      "Get free AI-powered smart vending machines for your Las Vegas business. Zero cost installation, restocking & maintenance.",
    url: "https://kandevendtech.com",
  },
};

const homepageFaqs = [
  {
    question: "How much does a vending machine cost to install in Las Vegas?",
    answer:
      "Kande VendTech provides completely free vending machine installation in Las Vegas. There is zero cost for delivery, installation, restocking, and maintenance. We handle everything at no charge to you.",
  },
  {
    question: "What types of locations do you serve in Las Vegas?",
    answer:
      "We serve hotels & resorts, corporate offices, luxury apartments, fitness centers, universities, and hospitals across the entire Las Vegas valley — from the Strip to Summerlin.",
  },
  {
    question: "What products are available in your smart vending machines?",
    answer:
      "Our machines offer access to over 40,000 products including healthy & organic snacks, beverages, fresh food like sandwiches and salads, classic snacks, energy drinks, and more. We customize the product mix to fit your location.",
  },
  {
    question: "What payment methods do your vending machines accept?",
    answer:
      "Our smart vending machines accept Apple Pay, Google Pay, tap-to-pay credit and debit cards, mobile wallets, and traditional payment methods. All machines feature contactless payment technology.",
  },
  {
    question: "How does the restocking process work?",
    answer:
      "Our machines use smart sensors and AI inventory management that automatically notify us when stock is running low. We proactively restock before items run out, ensuring your machine is always full.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <FAQJsonLd faqs={homepageFaqs} />
      <Navbar />

      <main className="flex-1">
        <AnimatedHero />
        <TrustStats />
        <ValueProps />
        <SmartTechnology />
        <BusinessBenefits />
        <LocalFocus />
        <HowItWorks />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
