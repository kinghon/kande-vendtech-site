import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Apple, Coffee, Sandwich, Cookie } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
    title: "Smart Vending Machine Products Las Vegas | Snacks, Meals, Beverages",
    description: "Browse 40,000+ vending machine products available in Las Vegas. Healthy snacks, fresh meals, beverages, organic options & more. Customized product selection for your location.",
    alternates: {
        canonical: "https://kandevendtech.com/products",
    },
    openGraph: {
        title: "Smart Vending Machine Products Las Vegas | Kande VendTech",
        description: "Over 40,000 snack, meal & beverage options for your Las Vegas vending machine. Healthy, organic & premium selections.",
        url: "https://kandevendtech.com/products",
    },
};

export default function ProductsPage() {
    const categories = [
        {
            title: "Healthy & Organic",
            icon: Apple,
            items: ["Protein Bars", "Nuts & Trail Mix", "Dried Fruit", "Organic Chips", "Gluten-Free Options", "Keto Snaks"]
        },
        {
            title: "Beverages",
            icon: Coffee,
            items: ["Energy Drinks", "Cold Brew Coffee", "Sparkling Water", "Sports Drinks", "Premium Sodas", "Juices"]
        },
        {
            title: "Classic Snacks",
            icon: Cookie,
            items: ["Potato Chips", "Pretzels", "Cookies", "Crackers", "Candy Bars", "Gum & Mints"]
        },
        {
            title: "Fresh Food",
            icon: Sandwich,
            items: ["Sandwiches", "Salads", "Yogurt Parfaits", "Cheese Plates", "Cut Fruit", "Breakfast Items"]
        }
    ];

    return (
        <div className="flex flex-col min-h-screen">
            <BreadcrumbJsonLd items={[
                { name: "Home", href: "/" },
                { name: "Products", href: "/products" },
            ]} />
            <Navbar />

            <main className="flex-1">
                {/* Hero */}
                <section className="pt-32 pb-16 px-4 md:px-6">
                    <div className="container mx-auto text-center max-w-4xl">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Curated Selection <br /><span className="text-primary">Endless Variety</span></h1>
                        <p className="text-xl text-muted-foreground mb-8">
                            With access to over 40,000 products, we customize the menu to fit your location's specific tastes.
                            From gym-goers needing protein to office workers needing a caffeine boost.
                        </p>
                    </div>
                </section>

                {/* Categories */}
                <section className="py-16 container px-4 md:px-6">
                    <div className="grid md:grid-cols-2 gap-8">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="p-8 rounded-3xl bg-secondary/20 border border-border/50 flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                    <cat.icon className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-4">{cat.title}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {cat.items.map((item) => (
                                            <span key={item} className="px-3 py-1 rounded-full bg-background border border-border text-sm text-muted-foreground font-medium">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Brand Showcase (Placeholder for Logos) */}
                <section className="py-24 bg-card border-y border-border/50">
                    <div className="container px-4 md:px-6 text-center">
                        <h2 className="text-2xl font-semibold mb-12 text-muted-foreground">Featuring Your Favorite Brands</h2>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            {/* Placeholders for brands */}
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="h-12 bg-white/10 rounded flex items-center justify-center text-xs font-mono">
                                    BRAND {i}
                                </div>
                            ))}
                        </div>
                        <p className="mt-12 text-sm text-muted-foreground">
                            * Product availability varies by machine type and location needs.
                        </p>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 container px-4 md:px-6 text-center">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <h2 className="text-3xl font-bold">Don't See What You Want?</h2>
                        <p className="text-muted-foreground text-lg">
                            We can source almost any product you request. Our inventory system allows for rapid rotation of products to keep things exciting.
                        </p>
                        <div className="pt-4">
                            <Button size="lg" variant="glow" asChild>
                                <Link href="/contact">Request Specific Products</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
