import React from "react";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Checkbox({
  label,
  className = "",
  ...props
}: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <input
        type="checkbox"
        className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className}`.trim()}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
