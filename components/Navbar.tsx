import React from "react";

type NavbarProps = {
  title?: string;
  children?: React.ReactNode;
};

export default function Navbar({ title = "App", children }: NavbarProps) {
  return (
    <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      <div className="font-semibold text-gray-900">{title}</div>
      {children ? (
        <div className="flex items-center gap-3">{children}</div>
      ) : null}
    </nav>
  );
}
