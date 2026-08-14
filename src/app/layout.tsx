import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ToastProvider from "@/components/ToastProvider";
import { SessionWrapper } from "@/components/SessionWrapper";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import "./uploadthing-vendor.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AfriFlow — AfriSime Work-Flow",
  description: "Plateforme collaborative de gestion des projets, des tâches et de la performance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppSettingsProvider>
          <SessionWrapper>{children}</SessionWrapper>
          <ToastProvider />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
