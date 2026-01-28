"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, Zap, Leaf, MapPin, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />

          <div className="container relative z-10 px-4 md:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-4 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Serving Las Vegas, NV
              </div>

              <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 pb-2">
                The Future of Vending <br />
                <span className="text-primary">Is Here</span>
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Provide your location with AI-powered smart vending machines.
                Zero cost. Zero hassle. 100% premium experience.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Button size="lg" variant="glow" asChild className="text-lg px-8 h-14">
                  <Link href="/contact">
                    Get Your Free Machine <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8 h-14 bg-background/50 backdrop-blur-sm">
                  <Link href="/services">
                    See How It Works
                  </Link>
                </Button>
              </div>

              <div className="pt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" /> No Installation Cost
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" /> Full Service
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" /> 24/7 Support
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Value Props Section */}
        <section className="py-24 bg-secondary/30 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Kande VendTech?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We don't just supply machines; we provide a fully managed, high-tech amenity for your space.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Bot,
                  title: "AI Smart Machines",
                  desc: "Intelligent inventory tracking, cashless payments, and interactive touchscreens."
                },
                {
                  icon: Zap,
                  title: "$0 Cost to You",
                  desc: "We handle delivery, installation, restocking, and maintenance completely free of charge."
                },
                {
                  icon: Leaf,
                  title: "Fresh & Healthy",
                  desc: "Curated selection of 40,000+ products including healthy, organic, and premium options."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Local Focus Section */}
        <section className="py-24 relative">
          <div className="container px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative aspect-square md:aspect-video rounded-2xl overflow-hidden bg-muted/50 border border-border flex items-center justify-center group">
                {/* Abstract Map Graphic Placeholder */}
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-background via-transparent to-primary/10" />
                <MapPin className="w-16 h-16 text-primary animate-bounce relative z-10" />
                <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur border border-border px-4 py-2 rounded-lg text-sm font-medium">
                  Proudly Serving Las Vegas
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold">
                  Las Vegas' Premier <br /> <span className="text-primary">Vending Partner</span>
                </h2>
                <p className="text-lg text-muted-foreground">
                  From the Strip to Summerlin, we service hotels, luxury apartments, offices, and gyms across the entire Las Vegas valley.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {["Hotels & Resorts", "Corporate Offices", "Luxury Apartments", "Fitness Centers", "Universities", "Hospitals"].map((item) => (
                    <div key={item} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <Button variant="default" size="lg" className="mt-4" asChild>
                  <Link href="/services">Check Service Area</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <div className="container relative px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-8 p-12 rounded-3xl bg-background/50 backdrop-blur border border-white/10 shadow-2xl">
              <h2 className="text-4xl md:text-5xl font-bold">Ready to Upgrade Your Space?</h2>
              <p className="text-xl text-muted-foreground">
                Get a state-of-the-art smart vending machine installed at your location for free.
                Experience the Kande VendTech difference today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="glow" className="h-14 px-8 text-lg" asChild>
                  <Link href="/contact">Get Started Now</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg" asChild>
                  <Link href="/products">View Products</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
