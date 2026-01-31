import Link from "next/link";
import { Candy, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-background border-t border-border/50 pt-16 pb-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50">
                                <Candy className="w-5 h-5 text-primary" />
                            </div>
                            <span className="text-xl font-bold">Kande VendTech</span>
                        </Link>
                        <p className="text-muted-foreground text-sm max-w-xs">
                            Revolutionizing the vending experience in Las Vegas with AI technology and fresh, healthy options.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Company</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/services" className="hover:text-primary transition-colors">Services</Link></li>
                            <li><Link href="/products" className="hover:text-primary transition-colors">Products</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Services</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/services" className="hover:text-primary transition-colors">Free Installation</Link></li>
                            <li><Link href="/services" className="hover:text-primary transition-colors">Automated Restocking</Link></li>
                            <li><Link href="/services" className="hover:text-primary transition-colors">Maintenance & Repairs</Link></li>
                            <li><Link href="/products" className="hover:text-primary transition-colors">Product Selection</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Partner With Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-foreground">Connect</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                Serving Las Vegas, NV
                            </li>
                            <li>contact@kandevendtech.com</li>
                            <li>(702) 555-0123</li>
                        </ul>
                        <div className="flex gap-4 mt-6">
                            <Link href="#" className="p-2 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition-colors">
                                <Instagram className="w-4 h-4" />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition-colors">
                                <Linkedin className="w-4 h-4" />
                            </Link>
                            <Link href="#" className="p-2 rounded-full bg-muted hover:bg-primary/20 hover:text-primary transition-colors">
                                <Facebook className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>&copy; {currentYear} Kande VendTech. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
                        <Link href="#" className="hover:text-foreground">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
