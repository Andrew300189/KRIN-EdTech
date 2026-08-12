import type { Metadata } from "next";
import { CourseSalesPageContent } from "@/modules/courses/components/CourseSalesPageContent";
import { getPublishedCourseBySlug } from "@/modules/courses/services/content.service";

/** Internal rendering target for the canonical public /courses/[slug] URL. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublishedCourseBySlug(slug);
  if (!course) return { title: "Course not found" };

  const description = (course.shortDescription || course.fullDescription || "Published English course details.").slice(0, 160);
  const canonical = `/courses/${course.slug}`;
  const image = course.coverImage || "/opengraph-image";
  return {
    title: course.title,
    description,
    alternates: {
      canonical,
      languages: { [course.language]: canonical },
    },
    openGraph: { type: "website", title: course.title, description, url: canonical, images: [{ url: image, alt: course.title }] },
    twitter: { card: "summary_large_image", title: course.title, description, images: [image] },
  };
}

export default async function CourseDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Parameters<typeof CourseSalesPageContent>[0]["searchParams"] }) {
  const courseParams = params.then(({ slug }) => ({ level: slug }));
  return <CourseSalesPageContent params={courseParams} searchParams={searchParams} />;
}
