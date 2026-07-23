import React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options?: Array<{ label: string; value: string }>;
};

export default function Select({
  label,
  options = [],
  className = "",
  ...props
}: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label ? <span>{label}</span> : null}
      <select
        className={`rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 ${className}`.trim()}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
