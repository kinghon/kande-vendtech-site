import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Settings, Truck, Box, Smartphone, Clock } from "lucide-react";

export const metadata = {
    title: "Our Services",
    description: "Full-service smart vending solutions including free installation, restocking, and maintenance.",
};

export default function ServicesPage() {
    const services = [
        {
            icon: Truck,
            title: "Free Installation & Delivery",
            description: "We handle the entire logistics process. From site survey to machine placement, our team ensures a seamless installation experience at zero cost to you."
        },
        {
            icon: Box,
            title: "Automated Restocking",
            description: "Smart sensors notify us when inventory is low. We restock your machine before it runs out, ensuring your favorite snacks are always available."
        },
        {
            icon: Settings,
            title: "Maintenance & Repairs",
            description: "Our technicians provide regular maintenance and 24/7 repair support. If a machine has an issue, we fix it immediately at no charge."
        },
        {
            icon: Smartphone,
            title: "Cashless Payments",
            description: "Modern payment options including Apple Pay, Google Pay, Credit/Debit cards, and employee reward programs for maximum convenience."
        },
        {
            icon: Clock,
            title: "Real-Time Monitoring",
            description: "We monitor machine health and sales data remotely to optimize product selection based on what your specific location actually wants."
        },
        {
            icon: Check,
            title: "Custom Product Selection",
            description: "You choose what goes in. We work with you to curate a menu that fits your employees', guests', or residents' preferences."
        }
    ];

    const steps = [
        {
            number: "01",
            title: "Consultation",
            desc: "We visit your location to assess traffic and determine the best machine and product mix for your space."
        },
        {
            number: "02",
            title: "Installation",
            desc: "Our team delivers and installs the machine at a time that works for you. No wiring or complex setup required."
        },
        {
            number: "03",
            title: "Stocking",
            desc: "We fill the machine with a curated selection of fresh snacks, drinks, and healthy options."
        },
        {
            number: "04",
            title: "Enjoy",
            desc: "Sit back and enjoy the convenience. We handle everything else in the background."
        }
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero */}
                <section className="pt-32 pb-16 px-4 md:px-6 bg-secondary/20">
                    <div className="container mx-auto text-center max-w-4xl">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Full-Service Vending <br /><span className="text-primary">Zero Hassle</span></h1>
                        <p className="text-xl text-muted-foreground mb-8">
                            We take care of everything so you can focus on your business.
                            Our comprehensive service package is designed to be completely hands-off for location managers.
                        </p>
                    </div>
                </section>

                {/* Services Grid */}
                <section className="py-24 container px-4 md:px-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, idx) => (
                            <div key={idx} className="p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] group">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                    <service.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {service.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-24 bg-muted/30">
                    <div className="container px-4 md:px-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">How It Works</h2>

                        <div className="grid md:grid-cols-4 gap-8 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-8 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                            {steps.map((step, idx) => (
                                <div key={idx} className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary mb-6 shadow-lg">
                                        {step.number}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                    <p className="text-muted-foreground text-sm">
                                        {step.desc}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 text-center">
                            <Button size="lg" variant="glow" asChild>
                                <Link href="/contact">Schedule Your Consultation</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
