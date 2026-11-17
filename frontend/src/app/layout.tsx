import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SiteChrome } from "@/components/layout/SiteChrome";

export const metadata: Metadata = {
  title: "Dual Kitchens | Premium Veg & Non-Veg Food Ordering",
  description:
    "Delicious gourmet food delivered to your door from two dedicated commercial kitchens: 100% Pure Vegetarian & Authentic Charcoal Non-Veg.",
  keywords: [
    "food delivery",
    "pure veg food",
    "non-veg grill",
    "biryani delivery",
    "cloud kitchen",
    "online restaurant",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen flex flex-col bg-cream-50 font-sans antialiased selection:bg-primary-500 selection:text-white">
        <AppProviders>
          <SiteChrome>{children}</SiteChrome>
        </AppProviders>
      </body>
    </html>
  );
}
