import React, { useState } from "react";

export default function PromptInput() {
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
        placeholder="Type a prompt..."
      />
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
        Run
      </button>
    </div>
  );
}
