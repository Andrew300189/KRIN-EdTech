import React from "react";

export default function Loader() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      Loading...
    </div>
  );
}
