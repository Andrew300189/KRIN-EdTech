import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
};

export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 font-medium transition ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
