import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LocaleProvider } from "@/i18n/locale";
import { detectLocale, dirOf, type Locale } from "@/i18n/messages";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fox Retro",
  description: "Live Scrum retrospectives your team actually looks forward to.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieLocale = (await cookies()).get("locale")?.value;
  const locale: Locale =
    cookieLocale === "ar" || cookieLocale === "en"
      ? cookieLocale
      : detectLocale((await headers()).get("accept-language"));

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">
        <ThemeProvider>
          <LocaleProvider initial={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
