import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseSalesPageContent } from "@/modules/courses/components/CourseSalesPageContent";
import { defaultContentLocale, isTranslatableContentLocale, normalizeContentLocale } from "@/modules/courses/localization/content-locales";
import { getPublishedCourseBySlug } from "@/modules/courses/services/content.service";

type RouteParams = Promise<{ locale: string; slug: string }>;

export async function generateMetadata({ params }: { params: RouteParams }): Promise<Metadata> {
  const { locale: inputLocale, slug } = await params;
  const locale = normalizeContentLocale(inputLocale);
  if (!isTranslatableContentLocale(locale)) return { title: "Course not found" };
  const course = await getPublishedCourseBySlug(slug, locale);
  if (!course || course.contentLocale === defaultContentLocale) return { title: "Course not found" };
  const description = (course.translations[0]?.seoDescription || course.shortDescription || course.fullDescription || "Published English course details.").slice(0, 160);
  const title = course.translations[0]?.seoTitle || course.title;
  const canonical = `/${locale}/courses/${course.localizedSlug}`;
  const baseUrl = `/courses/${course.slug}`;
  const image = course.coverImage || "/opengraph-image";
  return { title, description, alternates: { canonical, languages: { en: baseUrl, [locale]: canonical } }, openGraph: { type: "website", title, description, url: canonical, images: [{ url: image, alt: course.title }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default async function LocalizedCoursePage({ params, searchParams }: { params: RouteParams; searchParams: Parameters<typeof CourseSalesPageContent>[0]["searchParams"] }) {
  const { locale: inputLocale, slug } = await params;
  const locale = normalizeContentLocale(inputLocale);
  if (!isTranslatableContentLocale(locale)) notFound();
  const course = await getPublishedCourseBySlug(slug, locale);
  if (!course || course.contentLocale === defaultContentLocale) notFound();
  return <CourseSalesPageContent params={Promise.resolve({ level: slug })} searchParams={searchParams} locale={locale} />;
}
