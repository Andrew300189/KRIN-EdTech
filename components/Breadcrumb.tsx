import React from "react";

type BreadcrumbProps = {
  items: Array<{ label: string; href?: string }>;
};

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <span>/</span> : null}
          {item.href ? (
            <a href={item.href} className="hover:text-blue-600">
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
