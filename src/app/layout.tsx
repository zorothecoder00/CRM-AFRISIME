import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import ToastProvider from "@/components/ToastProvider";
import { SessionWrapper } from "@/components/SessionWrapper";
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
        {/* Anti-FOUC (theme, remplace next-themes) — script brut plutot que
            le wrapper InlineScript (type text/javascript vs text/plain) :
            ce dernier n'evite l'avertissement dev "script tag" que dans un
            Client Component reevalue a chaque rendu navigateur (voir doc
            Next.js, section "Extracting a reusable component") ; ici,
            RootLayout est un Server Component, le ternaire ne s'execute
            qu'une fois cote serveur et fige type="text/javascript" dans le
            payload RSC -- si React recree ce noeud cote client, il reutilise
            cette valeur figee et l'avertissement se declenche quand meme
            (verifie dans react-dom-client.development.js, isScriptDataBlock).
            Preference systeme uniquement (aucun bouton clair/sombre dans
            l'app) : le direct est couvert par ThemeSync. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
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
