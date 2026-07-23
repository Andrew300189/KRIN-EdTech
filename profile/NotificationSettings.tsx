import React from 'react';

export default function NotificationSettings() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Notification settings</h3>
      <div className="mt-4 space-y-3 text-sm text-gray-600">
        <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <span>Email reminders</span>
          <input type="checkbox" defaultChecked />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <span>Weekly summary</span>
          <input type="checkbox" defaultChecked />
        </label>
      </div>
    </section>
  );
}
