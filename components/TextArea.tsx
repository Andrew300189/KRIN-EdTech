import React from "react";

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export default function TextArea({
  label,
  className = "",
  ...props
}: TextAreaProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label ? <span>{label}</span> : null}
      <textarea
        className={`min-h-[100px] rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 ${className}`.trim()}
        {...props}
      />
    </label>
  );
}
