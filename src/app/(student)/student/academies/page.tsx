import { redirect } from "next/navigation";

/** Academies are a discovery section of the unified learner catalogue. */
export default function StudentAcademiesPage() {
  redirect("/student/catalog#academies");
}
