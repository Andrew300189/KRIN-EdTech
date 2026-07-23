import React from 'react';

export default function AvatarUpload() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Avatar</h3>
      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-semibold text-gray-700">U</div>
        <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Upload image</button>
      </div>
    </section>
  );
}
