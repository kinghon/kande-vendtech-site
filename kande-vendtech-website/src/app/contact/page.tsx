import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ContactForm } from "@/components/forms/contact-form";
import { Mail, MapPin, Phone } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "Contact Kande VendTech | Free Vending Machine Las Vegas",
    description: "Contact Kande VendTech to get a free smart vending machine for your Las Vegas business. Free consultation, installation & setup. Call (725) 228-8822 or fill out our form.",
    alternates: {
        canonical: "https://kandevendtech.com/contact",
    },
    openGraph: {
        title: "Contact Kande VendTech | Free Vending Machine Las Vegas",
        description: "Get a free smart vending machine for your Las Vegas business. Free consultation, installation & setup.",
        url: "https://kandevendtech.com/contact",
    },
};

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <BreadcrumbJsonLd items={[
                { name: "Home", href: "/" },
                { name: "Contact", href: "/contact" },
            ]} />
            <Navbar />

            <main className="flex-1 pt-24 pb-16">
                <div className="container px-4 md:px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
                            <p className="text-xl text-muted-foreground">
                                Ready to upgrade your space? Contact us today for a free consultation.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mb-16">
                            <div className="p-6 rounded-2xl bg-secondary/30 border border-border flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Phone className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold mb-2">Phone</h3>
                                <p className="text-muted-foreground">(725) 228-8822</p>
                                <p className="text-xs text-muted-foreground mt-1">Mon-Fri, 9am - 6pm</p>
                            </div>

                            <div className="p-6 rounded-2xl bg-secondary/30 border border-border flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <Mail className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold mb-2">Email</h3>
                                <p className="text-muted-foreground">hello@kandevendtech.com</p>
                                <p className="text-xs text-muted-foreground mt-1">24/7 Response</p>
                            </div>

                            <div className="p-6 rounded-2xl bg-secondary/30 border border-border flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <MapPin className="w-6 h-6 text-primary" />
                                </div>
                                <h3 className="font-semibold mb-2">Office</h3>
                                <p className="text-muted-foreground">Las Vegas, NV</p>
                                <p className="text-xs text-muted-foreground mt-1">Serving the entire valley</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-start">
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Send us a Message</h2>
                                <p className="text-muted-foreground">
                                    Fill out the form to request information about placing a machine at your location.
                                    Please include details about your estimated foot traffic if known.
                                </p>
                                <div className="p-6 rounded-xl bg-primary/5 border border-primary/10">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                                        Current Response Time
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        We typically reply to all inquiries within 24 hours.
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 rounded-3xl bg-card border border-border/50 shadow-lg">
                                <ContactForm />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
