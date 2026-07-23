import React from "react";

type SearchInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export default function SearchInput(props: SearchInputProps) {
  return (
    <input
      type="search"
      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
      {...props}
    />
  );
}
