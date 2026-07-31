import { AdminCategoryForm } from "@/modules/courses/components/admin/AdminCategoryForm";
import { listManagedCourseCategories } from "@/modules/courses/services/content.service";

export default async function AdminCategoriesPage() {
  const categories = await listManagedCourseCategories();
  return <div className="space-y-7"><header><h1 className="text-3xl font-bold">Course categories</h1><p className="mt-2 text-gray-600">Published categories are available as directions in the public course catalogue.</p></header><AdminCategoryForm /><section><h2 className="text-xl font-bold">Categories</h2><div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Courses</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id} className="border-t border-gray-100"><td className="px-4 py-3 font-semibold">{category.icon ? `${category.icon} ` : ""}{category.title}</td><td className="px-4 py-3 text-gray-600">{category.slug}</td><td className="px-4 py-3">{category._count.courses}</td><td className="px-4 py-3">{category.isPublished ? "Published" : "Draft"}</td></tr>)}</tbody></table></div></section></div>;
}
