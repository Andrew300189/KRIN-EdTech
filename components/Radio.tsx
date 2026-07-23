import React from "react";

type RadioProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Radio({ label, className = "", ...props }: RadioProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="radio"
        className={`h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`.trim()}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
