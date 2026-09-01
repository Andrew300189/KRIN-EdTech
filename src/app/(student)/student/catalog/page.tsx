import { requireRole } from "@/core/server/role-guard";
import { listStudentCatalogCourses } from "@/modules/courses/services/student-catalog.service";
import { StudentCatalogClient } from "./StudentCatalogClient";

const levelCodes = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

/**
 * The catalogue is rendered with its initial data on the server. Filtering is
 * intentionally performed by the client component so choosing a level or a
 * quick tag never navigates away from the catalogue.
 */
export default async function StudentCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; q?: string }>;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;

  const params = await searchParams;
  const requestedLevel = params.level?.trim().toUpperCase();
  const initialLevel = requestedLevel && levelCodes.has(requestedLevel)
    ? requestedLevel
    : "all";
  const initialQuery = params.q?.trim().slice(0, 200) ?? "";

  try {
    const courses = await listStudentCatalogCourses(guard.user.id);
    return <StudentCatalogClient initialCourses={courses} initialLevel={initialLevel} initialQuery={initialQuery} />;
  } catch {
    return <StudentCatalogClient initialCourses={[]} initialLevel={initialLevel} initialQuery={initialQuery} initialError="Unable to load the course catalog right now." />;
  }
}
