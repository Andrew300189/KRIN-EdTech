import type { MetadataRoute } from "next";
import { SITE_URL } from "@/core/config/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/courses", "/levels", "/pricing", "/course-finder", "/professional", "/tests", "/lesson-preview", "/teachers", "/about", "/help", "/contact", "/legal/"], disallow: ["/api/", "/admin/", "/cms/", "/dashboard/", "/student/", "/teacher/", "/profile/", "/login", "/register", "/onboarding", "/payment/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
