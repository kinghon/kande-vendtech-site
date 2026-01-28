import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Users, Target, Heart } from "lucide-react";

export const metadata = {
    title: "About Us",
    description: "Learn about Kande VendTech, our mission to revolutionize vending in Las Vegas, and our commitment to service.",
};

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />

            <main className="flex-1">
                {/* Hero */}
                <section className="pt-32 pb-16 px-4 md:px-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-primary/5 rounded-full blur-[100px]" />
                    <div className="container mx-auto max-w-4xl text-center relative z-10">
                        <h1 className="text-4xl md:text-6xl font-bold mb-6">Redefining Convenience <br /> in <span className="text-primary">Las Vegas</span></h1>
                        <p className="text-xl text-muted-foreground mb-8 text-center mx-auto max-w-2xl">
                            We started with a simple idea: Vending machines shouldn't be boring, broken, or empty.
                            They should be smart, reliable, and filled with things you actually want.
                        </p>
                    </div>
                </section>

                {/* Mission/Values */}
                <section className="py-16 container px-4 md:px-6">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-2xl bg-secondary/20 border border-border/50">
                            <Target className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Our Mission</h3>
                            <p className="text-muted-foreground">
                                To modernize the breakroom experience by providing cutting-edge technology and superior product selection without any hassle to business owners.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-secondary/20 border border-border/50">
                            <Heart className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Customer First</h3>
                            <p className="text-muted-foreground">
                                We believe in service above all. That means machines that work, food that is fresh, and a team that responds instantly to your needs.
                            </p>
                        </div>
                        <div className="p-8 rounded-2xl bg-secondary/20 border border-border/50">
                            <Users className="w-10 h-10 text-primary mb-6" />
                            <h3 className="text-xl font-bold mb-3">Local Team</h3>
                            <p className="text-muted-foreground">
                                As a Las Vegas based business, we understand the local market. From high-end hotels to 24/7 gyms, we know what Vegas needs.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Story Section */}
                <section className="py-24 bg-secondary/10">
                    <div className="container px-4 md:px-6">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 space-y-6">
                                <h2 className="text-3xl font-bold">The Kande VendTech Story</h2>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Founded in Las Vegas, Kande VendTech noticed a gap in the market. Traditional vending machines were often neglected, taking cash only, and stocking stale products.
                                </p>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    We decided to change that. By investing in AI-powered smart machines, we brought vending into the 21st century. Our machines track inventory in real-time, accept all forms of digital payment, and offer verified product freshness.
                                </p>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    Today, we serve dozens of locations across the Las Vegas valley, proving that convenience doesn't have to come at the cost of quality.
                                </p>
                            </div>
                            <div className="flex-1 w-full aspect-square md:aspect-video bg-muted rounded-2xl flex items-center justify-center border border-border/50 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 opacity-50" />
                                <div className="text-center p-8 relative z-10">
                                    <span className="text-4xl font-bold block mb-2">100+</span>
                                    <span className="text-sm text-muted-foreground uppercase tracking-wider">Machines Installed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}
