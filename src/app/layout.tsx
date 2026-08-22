// Global application layout for Next.js App Router
import type { Metadata } from "next";
import "./globals.css";
import ScrollToTopButton from "@/core/components/ScrollToTopButton";
import { SkipToMainContent } from "@/core/components/SkipToMainContent";
import { LocaleProvider } from "@/core/i18n/locale";
import { WebVitalsReporter } from "@/modules/analytics/components/WebVitalsReporter";

const themeBootstrap = `(() => {
  try {
    const storedTheme = window.localStorage.getItem("krin-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      document.documentElement.dataset.theme = storedTheme;
    }
  } catch {}
})();`;

export const metadata: Metadata = {
  title: {
    default: "KRIN EdTech | English courses A1–C2",
    template: "%s | KRIN EdTech",
  },
  description: "Choose a published English course, review its lesson outline and try an available lesson before paying.",
  metadataBase: new URL("https://krin-edtech.com"),
  applicationName: "KRIN EdTech",
  icons: {
    icon: "/logos/a-detailed-flat-vector-illustration-of-a-single-wh.png",
    shortcut: "/logos/a-detailed-flat-vector-illustration-of-a-single-wh.png",
    apple: "/logos/a-detailed-flat-vector-illustration-of-a-single-wh.png",
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "KRIN EdTech",
    title: "KRIN EdTech | English courses A1–C2",
    description: "Find a course by level and focus, then see its published programme before you choose access.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "KRIN EdTech English courses" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KRIN EdTech | English courses A1–C2",
    description: "Find a course by level and focus, then see its published programme before you choose access.",
    images: ["/opengraph-image"],
  },
};

const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "KRIN EdTech",
      url: "https://krin-edtech.com",
      logo: "https://krin-edtech.com/opengraph-image",
    },
    {
      "@type": "WebSite",
      name: "KRIN EdTech",
      url: "https://krin-edtech.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://krin-edtech.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
  ],
}).replace(/</g, "\\u003c");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <LocaleProvider>
          <SkipToMainContent />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
          <div id="main-content" tabIndex={-1}>{children}</div>
          <WebVitalsReporter />
          <ScrollToTopButton />
        </LocaleProvider>
      </body>
    </html>
  );
}
