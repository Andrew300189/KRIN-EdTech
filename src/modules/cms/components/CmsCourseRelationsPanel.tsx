import styles from "./CmsCourseRelationsPanel.module.css";

type CourseRelations = {
  curriculumLinks: Array<{ relation: string; node: { id: string; title: string; type: string; level: { code: string } } }>;
  modules: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string }> }>;
  commerceProducts: Array<{ id: string; title: string; code: string; isActive: boolean }>;
  studentAssignments: Array<{ id: string; status: string; teacher: { name: string | null; email: string }; student: { name: string | null; email: string } }>;
  groupAssignments: Array<{ id: string; status: string; group: { name: string }; assignedBy: { name: string | null; email: string } }>;
  _count: { studentCourses: number; students: number; studentAssignments: number; groupAssignments: number; coursePurchases: number; entitlements: number; commerceProducts: number };
};

/** Compact operational snapshot. Detailed relationships remain available on demand. */
export function CmsCourseRelationsPanel({ relations }: { relations: CourseRelations }) {
  const metrics = [
    ["Students added", relations._count.studentCourses],
    ["Purchases", relations._count.coursePurchases],
    ["Access rights", relations._count.entitlements],
    ["Assignments", relations._count.studentAssignments + relations._count.groupAssignments],
  ] as const;

  return <section className={styles.panel}>
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Course health</p>
        <h2>Course relationships and impact</h2>
      </div>
      <span className={styles.archiveHint}>Archive keeps learner history</span>
    </header>

    <dl className={styles.metrics}>
      {metrics.map(([label, value]) => <div key={label} className={styles.metric}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>)}
    </dl>

    <details className={styles.details}>
      <summary>Expand details</summary>
      <div className={styles.detailsGrid}>
        <RelationGroup title="Where the course appears">
          {relations.curriculumLinks.length
            ? <ul>{relations.curriculumLinks.map((link) => <li key={link.node.id}><strong>{link.relation}</strong> · {link.node.level.code} · {link.node.type.toLowerCase()} · {link.node.title}</li>)}</ul>
            : <p>Level-only placement; no specific curriculum node is linked.</p>}
        </RelationGroup>
        <RelationGroup title="Curriculum structure">
          {relations.modules.length
            ? <ul>{relations.modules.map((module) => <li key={module.id}><strong>{module.title}</strong> · {module.lessons.length} lesson{module.lessons.length === 1 ? "" : "s"}{module.lessons.length ? <span>{module.lessons.map((lesson) => lesson.title).join(" · ")}</span> : null}</li>)}</ul>
            : <p>No modules have been added.</p>}
        </RelationGroup>
        <RelationGroup title="Commerce products">
          {relations.commerceProducts.length
            ? <ul>{relations.commerceProducts.map((product) => <li key={product.id}><strong>{product.title}</strong> · <code>{product.code}</code> · {product.isActive ? "active" : "inactive"}</li>)}</ul>
            : <p>No commerce product is linked.</p>}
        </RelationGroup>
        <RelationGroup title="Teacher assignments">
          {relations.studentAssignments.length || relations.groupAssignments.length
            ? <ul>{relations.studentAssignments.map((assignment) => <li key={assignment.id}>Individual · {assignment.status} · {assignment.teacher.name ?? assignment.teacher.email} → {assignment.student.name ?? assignment.student.email}</li>)}{relations.groupAssignments.map((assignment) => <li key={assignment.id}>Group “{assignment.group.name}” · {assignment.status} · assigned by {assignment.assignedBy.name ?? assignment.assignedBy.email}</li>)}</ul>
            : <p>No teacher assignments.</p>}
        </RelationGroup>
      </div>
    </details>
  </section>;
}

function RelationGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className={styles.relationGroup}>
    <h3>{title}</h3>
    {children}
  </section>;
}
