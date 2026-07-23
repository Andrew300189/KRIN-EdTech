import React from "react";

type TooltipProps = {
  label: string;
  children: React.ReactNode;
};

export default function Tooltip({ label, children }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
        {label}
      </span>
    </div>
  );
}
