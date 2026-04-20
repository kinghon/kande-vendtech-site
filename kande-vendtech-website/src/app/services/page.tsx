import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Settings, Truck, Box, Smartphone, Clock } from "lucide-react";
import { ServiceJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "Free Vending Machine Services Las Vegas | Installation, Restocking, Maintenance",
    description: "Full-service smart vending machine solutions in Las Vegas. Free installation, automated restocking, 24/7 maintenance & repair, cashless payments, and real-time monitoring. Zero cost to you.",
    alternates: {
        canonical: "https://kandevendtech.com/services",
    },
    openGraph: {
        title: "Free Vending Machine Services Las Vegas | Kande VendTech",
        description: "Full-service smart vending solutions. Free installation, automated restocking, 24/7 maintenance. Zero cost to your business.",
        url: "https://kandevendtech.com/services",
    },
};

const faqItems = [
    {
        q: "Does it really cost nothing?",
        a: "Yes. No installation fees, no monthly charges, no equipment costs. The machine pays for itself through sales revenue. You do not receive a bill."
    },
    {
        q: "Is there a contract?",
        a: "No. There is no contract and no minimum term. If you want the machine removed, we pick it up. No penalty. No hassle."
    },
    {
        q: "How often does the machine get restocked?",
        a: "We restock 1 to 3 times per week depending on how fast products move. We track sales in real time and adjust our schedule to match."
    },
    {
        q: "What happens if the machine breaks?",
        a: "We monitor machines remotely and respond within 24 hours. Most service calls get resolved the same day. We often catch issues before you do."
    },
    {
        q: "Can we choose what goes in the machine?",
        a: "Yes. Give us a list of preferred products, brands, or categories and we will accommodate them. We also bring data from similar locations to suggest what will sell best."
    },
    {
        q: "What payment methods are supported?",
        a: "Apple Pay, Google Pay, credit cards, debit cards, and cash. We also support employee reward and pre-paid programs if that is relevant for your setup."
    },
    {
        q: "Can we get more than one machine?",
        a: "Yes. Larger offices, multi-floor buildings, and high-volume facilities often run multiple machines. We can mix types depending on what each area needs."
    },
    {
        q: "What if sales are low?",
        a: "We adjust the product mix first. If that does not move the needle, we can try a different machine type. Combo machines often outperform single-category units in smaller locations. If the spot simply does not work, we remove the machine at no cost to you."
    }
];

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
            <ServiceJsonLd />
            <BreadcrumbJsonLd items={[
                { name: "Home", href: "/" },
                { name: "Services", href: "/services" },
            ]} />
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

                {/* Revenue Share Model */}
                <section className="py-24 bg-muted/30">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-8">How the Zero-Cost Revenue Share Works</h2>
                        <p className="text-muted-foreground text-lg mb-6">
                            Most businesses assume vending means buying or leasing equipment, managing inventory, and calling a repair service when something breaks. That is not how we work.
                        </p>
                        <p className="text-muted-foreground text-lg mb-6">
                            We place a machine on your property. We keep it stocked and working. Sales pay for the product and the service. You get a percentage of the revenue every month. That means zero risk for you. If the machine does not sell, it costs you nothing. If it sells well, you earn passive income without lifting a finger. There is no minimum term. No cancellation penalty. We earn when you earn.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 mt-8">
                            {[
                                "Equipment delivery and installation",
                                "All restocking and product replenishment",
                                "Routine maintenance and repairs",
                                "Cashless payment hardware (Apple Pay, Google Pay, credit and debit cards)",
                                "Real-time sales monitoring and product mix adjustments"
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                                    <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                    <span className="text-sm text-muted-foreground">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* What We Install */}
                <section className="py-24">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-8">What We Install</h2>
                        <p className="text-muted-foreground text-lg mb-6">
                            We carry a full range of machines to fit different spaces and traffic patterns. A busy break room might get a{" "}
                            <Link href="/snack-vending-machines/" className="text-primary hover:underline">dedicated snack machine</Link>{" "}
                            alongside a{" "}
                            <Link href="/drink-vending-machines/" className="text-primary hover:underline">cold beverage unit</Link>.
                            Smaller spaces often do better with a{" "}
                            <Link href="/combo-vending-machines/" className="text-primary hover:underline">combo machine that covers both snacks and drinks in a single footprint</Link>.
                            If your team starts early and runs on caffeine, we can add a{" "}
                            <Link href="/coffee-vending-machines/" className="text-primary hover:underline">fresh-brew coffee machine</Link>{" "}
                            that handles hot drinks on demand.
                        </p>
                        <p className="text-muted-foreground text-lg mb-6">
                            For locations where product selection matters beyond chips and soda, we stock{" "}
                            <Link href="/healthy-vending-machines/" className="text-primary hover:underline">machines focused on better-for-you options</Link>{" "}
                            including protein bars, trail mix, sparkling water, and low-sugar drinks. We also carry{" "}
                            <Link href="/meal-vending-machines/" className="text-primary hover:underline">machines set up for full meals</Link>,{" "}
                            which work well for facilities with extended shifts or no nearby food options.
                        </p>
                        <p className="text-muted-foreground text-lg">
                            During your consultation, we look at your space and recommend the right configuration. You are not locked into one machine type forever. If traffic changes or your needs shift, we can swap equipment.
                        </p>
                    </div>
                </section>

                {/* Product Variety */}
                <section className="py-24 bg-muted/30">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-8">Product Variety: 40 to 60 SKUs</h2>
                        <p className="text-muted-foreground text-lg mb-6">
                            Every machine carries 40 to 60 different products. That is not a random mix. We choose every item based on three things: what you tell us your people want, what sells well in similar locations, and what our data shows about buying patterns in your area.
                        </p>
                        <p className="text-muted-foreground text-lg mb-6">
                            After the machine goes live, we monitor sales weekly. Slow movers get replaced. High-demand items get restocked faster. If someone at your location has been requesting a specific brand or product, let us know and we will add it. The goal is a machine that people actually use.
                        </p>
                        <p className="text-muted-foreground text-lg">
                            Product preferences differ a lot by location type. A{" "}
                            <Link href="/gym-vending-machines/" className="text-primary hover:underline">gym or fitness center</Link>{" "}
                            gets a very different mix than a{" "}
                            <Link href="/hotel-vending-machines/" className="text-primary hover:underline">hotel property</Link>{" "}
                            or a{" "}
                            <Link href="/hospital-vending-machines/" className="text-primary hover:underline">hospital break room</Link>.
                            We account for that from day one.
                        </p>
                    </div>
                </section>

                {/* SLA */}
                <section className="py-24">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-8">Service Levels and Response Times</h2>
                        <p className="text-muted-foreground text-lg mb-8">When something needs attention, we move fast.</p>
                        <div className="space-y-6">
                            {[
                                {
                                    title: "Restocking",
                                    body: "We monitor inventory in real time and restock before anything runs out. Our route drivers check expiration dates, rotate stock, and clean the machine on every visit. Most locations get visited one to three times per week depending on volume."
                                },
                                {
                                    title: "Repairs",
                                    body: "If a machine goes down, we commit to a technician on-site within 24 hours. Most issues are resolved same day."
                                },
                                {
                                    title: "Product Issues",
                                    body: "If a product dispenses incorrectly or someone loses money, we make it right immediately. Contact us directly and it gets handled."
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="p-6 rounded-xl bg-card border border-border/50">
                                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.body}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-muted-foreground text-lg mt-8">
                            We track machine health remotely and often catch problems before anyone on your end notices.
                        </p>
                    </div>
                </section>

                {/* Who This Fits */}
                <section className="py-24 bg-muted/30">
                    <div className="container px-4 md:px-6 max-w-4xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-8">Who This Fits</h2>
                        <p className="text-muted-foreground text-lg mb-8">We serve businesses, buildings, and institutions across Las Vegas and Henderson. Good fits include:</p>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {[
                                { title: "Offices with 30+ people", body: "Break rooms, lobbies, and common areas.", href: "/office-vending-machines/", linkText: "Office vending" },
                                { title: "Apartment buildings", body: "Lobbies and amenity floors give residents easy access without leaving the building.", href: "/apartment-building-vending-machines/", linkText: "Residential vending" },
                                { title: "Warehouses and distribution centers", body: "Shift workers need food options at all hours.", href: "/workplace-vending-machines/", linkText: "Workplace vending" },
                                { title: "Schools", body: "We stock compliant products that meet nutrition guidelines.", href: "/school-vending-machines/", linkText: "School vending" },
                                { title: "Hotels", body: "Guests want late-night snacks. We place machines where foot traffic is constant.", href: "/hotel-vending-machines/", linkText: "Hotel vending" },
                                { title: "Hospitals and clinics", body: "Staff and visitors need 24/7 food access.", href: "/hospital-vending-machines/", linkText: "Hospital vending" },
                                { title: "Gyms and fitness centers", body: "Protein bars, electrolyte drinks, and recovery snacks that match your members' habits.", href: "/gym-vending-machines/", linkText: "Gym vending" }
                            ].map((item, idx) => (
                                <div key={idx} className="p-5 rounded-xl bg-card border border-border/50">
                                    <Link href={item.href} className="font-bold text-primary hover:underline">{item.linkText}</Link>
                                    <p className="font-semibold mt-1 mb-1">{item.title}</p>
                                    <p className="text-sm text-muted-foreground">{item.body}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-muted-foreground text-lg mt-8">
                            If you are unsure whether your location is a fit, just reach out. We will be honest with you about whether the numbers make sense.
                        </p>
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-24">
                    <div className="container px-4 md:px-6">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">From First Call to Live Machine</h2>
                        <p className="text-center text-muted-foreground text-lg mb-16">Typically 5 to 10 business days.</p>

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

                {/* FAQ */}
                <section className="py-24 bg-muted/30">
                    <div className="container px-4 md:px-6 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                            {faqItems.map((item, idx) => (
                                <div key={idx} className="p-6 rounded-xl bg-card border border-border/50">
                                    <h3 className="font-bold text-lg mb-3">{item.q}</h3>
                                    <p className="text-muted-foreground">{item.a}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-16 text-center">
                            <Button size="lg" variant="glow" asChild>
                                <Link href="/contact">Get Started &mdash; It&apos;s Free</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
