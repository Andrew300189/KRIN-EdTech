import React from "react";

type TabsProps = {
  items: Array<{ label: string; content: React.ReactNode }>;
};

export default function Tabs({ items }: TabsProps) {
  const [active, setActive] = React.useState(0);

  return (
    <div>
      <div className="flex gap-2 border-b border-gray-200">
        {items.map((item, index) => (
          <button
            key={item.label}
            onClick={() => setActive(index)}
            className={`px-3 py-2 text-sm font-medium ${active === index ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{items[active]?.content}</div>
    </div>
  );
}
