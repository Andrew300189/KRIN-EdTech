import React from 'react';

type DialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

export default function Dialog({ open, title, description, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        {title ? <h3 className="text-lg font-semibold text-gray-900">{title}</h3> : null}
        {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}
