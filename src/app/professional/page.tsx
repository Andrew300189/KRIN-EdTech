import type { Metadata } from "next";
import { CourseCollectionPage } from "@/modules/courses/components/CourseCollectionPage";

export const metadata: Metadata = { title: "Professional English courses", description: "Browse published Professional English courses by level, focus and access conditions.", alternates: { canonical: "/professional" } };

export default function ProfessionalCoursesPage() {
  return <CourseCollectionPage type="PROFESSIONAL" eyebrow="Professional English" title="English courses for professional contexts." introduction="Explore published courses marked by their author as Professional English. Each course still states its CEFR level, programme and access conditions before you enrol." emptyTitle="Professional English courses are being prepared." emptyDescription="The owner has not published a professional course yet." relatedHref="/tests" relatedLabel="Browse English tests" />;
}
