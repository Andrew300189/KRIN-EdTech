import React from 'react';

export default function SecuritySettings() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Security settings</h3>
      <div className="mt-4 space-y-3">
        <button className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left text-gray-700">Change password</button>
        <button className="w-full rounded-lg border border-gray-300 px-4 py-2 text-left text-gray-700">Enable 2FA</button>
      </div>
    </section>
  );
}
