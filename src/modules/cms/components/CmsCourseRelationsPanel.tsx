type CourseRelations = {
  curriculumLinks: Array<{ relation: string; node: { id: string; title: string; type: string; level: { code: string } } }>;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>;
  commerceProducts: Array<{ id: string; title: string; code: string; isActive: boolean }>;
  studentAssignments: Array<{ id: string; status: string; teacher: { name: string | null; email: string }; student: { name: string | null; email: string } }>;
  groupAssignments: Array<{ id: string; status: string; group: { name: string }; assignedBy: { name: string | null; email: string } }>;
  _count: { studentCourses: number; students: number; studentAssignments: number; groupAssignments: number; coursePurchases: number; entitlements: number; commerceProducts: number };
};

export function CmsCourseRelationsPanel({ relations }: { relations: CourseRelations }) {
  const metrics = [
    ["Students who added it", relations._count.studentCourses],
    ["Legacy enrolled students", relations._count.students],
    ["Individual assignments", relations._count.studentAssignments],
    ["Group assignments", relations._count.groupAssignments],
    ["Purchases", relations._count.coursePurchases],
    ["Active or historical entitlements", relations._count.entitlements],
  ] as const;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-bold text-slate-950">Course relationships and impact</h2>
    <p className="mt-1 text-sm text-slate-600">Archive is non-destructive: progress, assignments and purchase records remain connected to this course.</p>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{metrics.map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-medium text-slate-600">{label}</dt><dd className="mt-1 text-2xl font-bold text-slate-950">{value}</dd></div>)}</dl>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="font-semibold text-slate-900">Where the course appears</h3>{relations.curriculumLinks.length ? <ul className="mt-2 space-y-2 text-sm">{relations.curriculumLinks.map((link) => <li key={link.node.id} className="rounded border border-slate-200 p-2"><span className="font-semibold">{link.relation}</span> · {link.node.level.code} · {link.node.type.toLowerCase()} · {link.node.title}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Level-only placement; no specific curriculum node is linked.</p>}</div><div><h3 className="font-semibold text-slate-900">Curriculum structure</h3>{relations.modules.length ? <ul className="mt-2 space-y-2 text-sm">{relations.modules.map((module) => <li key={module.id} className="rounded border border-slate-200 p-2"><span className="font-semibold">{module.title}</span><span className="ml-1 text-slate-500">· {module.lessons.length} lessons</span>{module.lessons.length ? <p className="mt-1 text-xs text-slate-600">{module.lessons.map((lesson) => lesson.title).join(" · ")}</p> : null}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No modules have been added.</p>}</div></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2"><div><h3 className="font-semibold text-slate-900">Commerce products</h3>{relations.commerceProducts.length ? <ul className="mt-2 space-y-2 text-sm">{relations.commerceProducts.map((product) => <li key={product.id} className="rounded border border-slate-200 p-2"><span className="font-semibold">{product.title}</span> <span className="font-mono text-xs text-slate-500">{product.code}</span> · {product.isActive ? "active" : "inactive"}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No commerce product is linked.</p>}</div><div><h3 className="font-semibold text-slate-900">Teacher assignments</h3>{relations.studentAssignments.length || relations.groupAssignments.length ? <ul className="mt-2 space-y-2 text-sm">{relations.studentAssignments.map((assignment) => <li key={assignment.id} className="rounded border border-slate-200 p-2">Individual · {assignment.status} · {assignment.teacher.name ?? assignment.teacher.email} → {assignment.student.name ?? assignment.student.email}</li>)}{relations.groupAssignments.map((assignment) => <li key={assignment.id} className="rounded border border-slate-200 p-2">Group “{assignment.group.name}” · {assignment.status} · assigned by {assignment.assignedBy.name ?? assignment.assignedBy.email}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No teacher assignments.</p>}</div></div>
  </section>;
}
