import { requireRole } from "@/core/server/role-guard";
import { SearchResultsPage } from "@/modules/search/components/SearchResultsPage";

export default async function TeacherSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requireRole(["teacher"]);
  if (!guard.ok) return null;
  return (
    <SearchResultsPage
      context="TEACHER"
      basePath="/teacher/search"
      searchParams={await searchParams}
      principal={{
        userId: guard.user.id,
        role: guard.user.role,
        locale: guard.user.interfaceLanguage,
      }}
    />
  );
}
