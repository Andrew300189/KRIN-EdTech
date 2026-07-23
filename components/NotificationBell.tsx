import React from 'react';

type NotificationBellProps = {
  count?: number;
};

export default function NotificationBell({ count = 0 }: NotificationBellProps) {
  return (
    <button className="relative rounded-full bg-gray-100 p-2 text-gray-700">
      🔔
      {count > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span> : null}
    </button>
  );
}
