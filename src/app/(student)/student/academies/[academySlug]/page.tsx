import { notFound, redirect } from "next/navigation";
import { getAcademyBySlug } from "@/modules/courses/constants/learning-paths";

/** Preserve any previously shared learner academy URLs. */
export default async function LegacyStudentAcademyPage({
  params,
}: {
  params: Promise<{ academySlug: string }>;
}) {
  const academySlug = (await params).academySlug;
  if (!getAcademyBySlug(academySlug)) notFound();
  redirect(`/student/catalog/academies/${academySlug}`);
}
