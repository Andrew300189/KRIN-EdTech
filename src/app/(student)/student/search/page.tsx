import { redirect } from "next/navigation";
import { requireRole } from "@/core/server/role-guard";

export default async function StudentSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guard = await requireRole(["student"]);
  if (!guard.ok) return null;
  const rawQuery = (await searchParams).q;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 200) : "";
  redirect(query ? `/student/catalog?q=${encodeURIComponent(query)}` : "/student/catalog");
}
