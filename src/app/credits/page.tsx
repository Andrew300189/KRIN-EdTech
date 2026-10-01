import type { Metadata } from "next";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";
import { CreditsContent } from "./CreditsContent";

export const metadata: Metadata = {
  title: "Image credits and licenses",
  description: "Authors, original sources and licenses for the botanical photographs used in KRIN EdTech.",
  alternates: { canonical: "/credits" },
};

export default function CreditsPage() {
  return <main>
    <PublicSiteHeader />
    <CreditsContent />
  </main>;
}
