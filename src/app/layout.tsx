import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ImpulseProviders } from "@/components/impulse/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Импульс — мессенджер",
  description: "Быстрый и красивый мессенджер для общения: сообщения, звонки, файлы, голосовые.",
  applicationName: "Импульс",
  authors: [{ name: "Импульс" }],
  keywords: ["мессенджер", "импульс", "чат", "звонки", "сообщения"],
  icons: {
    icon: "/impulse/favicon.svg",
  },
  manifest: "/impulse/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
        style={{ minHeight: "100dvh" }}
      >
        <ImpulseProviders>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors closeButton />
        </ImpulseProviders>
      </body>
    </html>
  );
}
