"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    company: z.string().optional(),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

export function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            phone: "",
            company: "",
            message: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(values);
        setIsSubmitting(false);
        setIsSuccess(true);
        form.reset();
    }

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-primary/10 border border-primary/20 text-center"
            >
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                <p className="text-muted-foreground mb-6">
                    Thank you for reaching out. A Kande VendTech representative will contact you shortly to discuss your free machine placement.
                </p>
                <Button onClick={() => setIsSuccess(false)} variant="outline">
                    Send Another Message
                </Button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                    <Input id="name" {...form.register("name")} placeholder="John Doe" />
                    {form.formState.errors.name && (
                        <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <Input id="email" type="email" {...form.register("email")} placeholder="john@company.com" />
                    {form.formState.errors.email && (
                        <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <Input id="phone" type="tel" {...form.register("phone")} placeholder="(725) 228-8822" />
                    {form.formState.errors.phone && (
                        <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="company" className="text-sm font-medium">Company / Location Name</label>
                    <Input id="company" {...form.register("company")} placeholder="Highrise Apartments" />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <Textarea
                    id="message"
                    {...form.register("message")}
                    placeholder="Tell us about your location and what you're looking for..."
                    className="min-h-[120px]"
                />
                {form.formState.errors.message && (
                    <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>
                )}
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting} variant="glow">
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                    </>
                ) : (
                    "Request Free Machine"
                )}
            </Button>
        </form>
    );
}
