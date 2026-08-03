import type { Metadata } from "next";
import { Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AppChrome } from "@/components/AppChrome";
import { getLang, getS } from "@/lib/i18n/server";
import { htmlLang } from "@/lib/i18n";
import { LangProvider } from "@/lib/i18n/client";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

// Depends on the language cookie, so it resolves at request time.
export async function generateMetadata(): Promise<Metadata> {
  const S = await getS();
  return { title: S.appTitle, description: S.appDescription };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html
      lang={htmlLang(lang)}
      className={`${golos.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <LangProvider lang={lang}>
          <AppChrome header={<SiteHeader />} footer={<SiteFooter />}>
            {children}
          </AppChrome>
        </LangProvider>
      </body>
    </html>
  );
}
