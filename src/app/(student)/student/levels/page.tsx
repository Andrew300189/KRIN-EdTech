import { redirect } from "next/navigation";

/** Levels are now filters within the learner catalogue. */
export default function StudentLevelsPage() {
  redirect("/student/catalog");
}
