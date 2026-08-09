import React from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightText(text: string, query: string) {
  const clean = query.trim();
  if (!clean) return [<React.Fragment key="all">{text}</React.Fragment>];

  const regex = new RegExp(`(${escapeRegExp(clean)})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.toLocaleLowerCase("en") === clean.toLocaleLowerCase("en")) {
      return <mark key={`${part}-${index}`}>{part}</mark>;
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}
