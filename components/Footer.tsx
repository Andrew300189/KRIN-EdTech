import React from "react";

type FooterProps = {
  children?: React.ReactNode;
};

export default function Footer({ children }: FooterProps) {
  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
      {children}
    </footer>
  );
}
