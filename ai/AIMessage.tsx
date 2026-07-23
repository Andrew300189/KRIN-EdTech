import React from "react";

export interface AIMessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function AIMessage({ role, content }: AIMessageProps) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-sm ${role === "assistant" ? "bg-gray-50 text-gray-700" : "bg-blue-50 text-blue-800"}`}
    >
      <div className="font-medium uppercase tracking-wide">{role}</div>
      <p className="mt-1">{content}</p>
    </div>
  );
}
