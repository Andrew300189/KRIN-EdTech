import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
      {label ? <span>{label}</span> : null}
      <input className={`rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 ${className}`.trim()} {...props} />
    </label>
  );
}
