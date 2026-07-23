import React from "react";

type AccordionItem = {
  title: string;
  content: React.ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
};

export default function Accordion({ items }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.title}
          className="rounded-lg border border-gray-200 bg-white"
        >
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-800"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            {item.title}
            <span>{openIndex === index ? "−" : "+"}</span>
          </button>
          {openIndex === index ? (
            <div className="px-4 pb-4 text-sm text-gray-600">
              {item.content}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
