import React from "react";

type ProgressBarProps = {
  value: number;
  max?: number;
};

export default function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  const percent = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
