import { SearchResultsPage } from "@/modules/search/components/SearchResultsPage";

export const metadata = {
  robots: { index: false, follow: true },
};

export default async function PublicSearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <SearchResultsPage context="PUBLIC" basePath="/search" searchParams={await searchParams} principal={{ userId: null, role: null, locale: "en" }} />;
}
