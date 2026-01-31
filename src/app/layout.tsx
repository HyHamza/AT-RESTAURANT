import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartProvider } from "@/contexts/cart-context";
import { AdminProvider } from "@/contexts/admin-context";
import { PWAInstall } from "@/components/pwa-install";
import { OfflineIndicator } from "@/components/offline-status";
import { OfflineInit } from "@/components/offline-init";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AT RESTAURANT - Fresh Food, Fast Delivery",
  description: "Order delicious food online from AT RESTAURANT. Fresh ingredients, fast delivery, and exceptional taste.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AT RESTAURANT" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AdminProvider>
          <CartProvider>
            <OfflineInit />
            
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
            
            {/* Simple offline indicator - only shows when offline */}
            <OfflineIndicator />
            
            <PWAInstall />
          </CartProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
