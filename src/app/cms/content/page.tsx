import { redirect } from "next/navigation";

/** Legacy CMS address retained so bookmarked owner links remain valid. */
export default function CmsContentPage() {
  redirect("/cms/courses");
}
