import type { Metadata } from "next";
import { CourseCollectionPage } from "@/modules/courses/components/CourseCollectionPage";

export const metadata: Metadata = { title: "English tests and exam preparation", description: "Browse published English test and exam-preparation courses with clear access conditions.", alternates: { canonical: "/tests" } };

export default function TestsPage() {
  return <CourseCollectionPage type="EXAM_PREP" eyebrow="English tests" title="Practise with published English test courses." introduction="This catalogue contains only published courses configured for exam preparation. A course page explains its level, programme, preview availability and access before payment." emptyTitle="English test courses are being prepared." emptyDescription="The owner has not published an exam-preparation course yet." relatedHref="/professional" relatedLabel="Browse Professional English" />;
}
