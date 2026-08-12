import { SearchResultsPage } from "@/modules/search/components/SearchResultsPage";
import { PublicSiteHeader } from "@/modules/navigation/components/PublicSiteHeader";

export const metadata = {
  robots: { index: false, follow: true },
};

export default async function PublicSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <main>
      <PublicSiteHeader />
      <SearchResultsPage
        context="PUBLIC"
        basePath="/search"
        searchParams={await searchParams}
        principal={{ userId: null, role: null, locale: "en" }}
      />
    </main>
  );
}
