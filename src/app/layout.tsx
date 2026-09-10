import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import ToastProvider from "@/components/ToastProvider";
import { SessionWrapper } from "@/components/SessionWrapper";
import { InlineScript } from "@/components/inline-script";
import { ThemeSync } from "@/components/theme-sync";
import { OfflineBanner } from "@/components/pwa/offline-banner";
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Anti-FOUC (theme, remplace next-themes) — voir InlineScript pour
            pourquoi ce n'est pas un <script> JSX direct. Preference systeme
            uniquement (aucun bouton clair/sombre dans l'app) : le direct est
            couvert par ThemeSync. */}
        <InlineScript html={`(function(){try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`} />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeSync />
          <OfflineBanner />
          <SessionWrapper>{children}</SessionWrapper>
          <ToastProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
