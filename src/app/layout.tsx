// Global application layout for Next.js App Router
import type { Metadata } from "next";
import "./globals.css";
import ScrollToTopButton from "@/core/components/ScrollToTopButton";

export const metadata: Metadata = {
  title: "KRIN EdTech - Learn English Online",
  description: "Advanced language learning platform with AI tutoring",
  metadataBase: new URL("https://krin-edtech.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}
