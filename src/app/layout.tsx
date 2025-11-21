import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "sonner"
import { Footer } from "@/components/footer"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { BACKGROUND_COOKIE_NAME, DEFAULT_BACKGROUND } from "@/lib/backgrounds";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NotesBhej",
  description: "Community-powered archive of IIIT-Gwalior course materials.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const backgroundScript = `(function() {
    var cookieName = ${JSON.stringify(BACKGROUND_COOKIE_NAME)};
    var fallback = ${JSON.stringify(DEFAULT_BACKGROUND)};
    var match = document.cookie.split("; ").find(function(cookie) {
      return cookie.startsWith(cookieName + "=");
    });
    var value = fallback;
    if (match) {
      var raw = match.substring(cookieName.length + 1);
      try {
        var parsed = JSON.parse(decodeURIComponent(raw));
        if (parsed && typeof parsed.value === "string" && parsed.value.length > 0) {
          value = parsed.value;
        }
      } catch (error) {
        // ignore parse issues
      }
    }
    document.documentElement?.style.setProperty("--app-background-image", value);
  })();`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="background-preference"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: backgroundScript }}
        />
      <link rel="manifest" href="/manifest.json" />

      <script defer src="https://cloud.umami.is/script.js" data-website-id="04566490-d0d4-46b4-a7f0-2df6cb40e5f1"></script>

      <link rel="preconnect" href="https://gcjwijdzlhvzqtdnnwaq.supabase.co" crossOrigin = "use-credentials" />
        <link rel="dns-prefetch" href="https://gcjwijdzlhvzqtdnnwaq.supabase.co" crossOrigin = "use-credentials" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-700`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
          <Footer />
          <Toaster richColors />
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
