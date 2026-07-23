import React from 'react';

type SidebarProps = {
  children?: React.ReactNode;
};

export default function Sidebar({ children }: SidebarProps) {
  return <aside className="h-full w-64 border-r border-gray-200 bg-gray-50 p-4">{children}</aside>;
}
