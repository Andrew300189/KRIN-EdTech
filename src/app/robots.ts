import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/courses", "/levels", "/pricing", "/course-finder", "/professional", "/tests", "/lesson-preview", "/teachers", "/about", "/help", "/contact", "/legal/"], disallow: ["/api/", "/admin/", "/cms/", "/dashboard/", "/student/", "/teacher/", "/profile/", "/login", "/register", "/onboarding", "/payment/"] },
    ],
    sitemap: "https://krin-edtech.com/sitemap.xml",
  };
}
