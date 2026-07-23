import React from "react";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
};

export default function Badge({ children, variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
