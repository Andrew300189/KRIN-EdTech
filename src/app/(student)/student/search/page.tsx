import { requireRole } from "@/core/server/role-guard";
import { SearchResultsPage } from "@/modules/search/components/SearchResultsPage";

export default async function StudentSearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  return <SearchResultsPage context="STUDENT" basePath="/student/search" searchParams={await searchParams} principal={{ userId: guard.user.id, role: guard.user.role, locale: guard.user.interfaceLanguage }} />;
}
