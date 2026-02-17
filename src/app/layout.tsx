import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./foodpanda-theme.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartProvider } from "@/contexts/cart-context";
import { AdminProvider } from "@/contexts/admin-context";
import { PWADiscountProvider } from "@/contexts/pwa-discount-context";
import { ToastProvider } from "@/components/ui/toast";
import { PWAInstallDiscount } from "@/components/pwa-install-discount";
import { OfflineIndicator } from "@/components/offline-status";
import { OfflineInit } from "@/components/offline-init";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AT RESTAURANT - Fresh Food, Fast Delivery",
  description: "Order delicious food online from AT RESTAURANT. Fresh ingredients, fast delivery, and exceptional taste.",
  // NOTE: Manifest is NOT set here to avoid conflicts with admin routes
  // User manifest is injected via <link> in <head> below
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#e11b70",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* User PWA Manifest - Will be overridden by AdminHead for /admin routes */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#e11b70" />
        <link rel="icon" type="image/x-icon" href="/assets/icons/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AT RESTAURANT" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ToastProvider>
          <AdminProvider>
            <PWADiscountProvider>
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
                
                <PWAInstallDiscount />
              </CartProvider>
            </PWADiscountProvider>
          </AdminProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
