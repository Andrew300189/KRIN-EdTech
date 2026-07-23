import React from 'react';

export interface BillingItem {
  id: string;
  date: string;
  amount: string;
  status: string;
}

export interface BillingHistoryProps {
  items: BillingItem[];
}

export default function BillingHistory({ items }: BillingHistoryProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Billing history</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <div>
              <p className="font-medium text-gray-900">{item.date}</p>
              <p className="text-sm text-gray-500">{item.status}</p>
            </div>
            <span className="font-semibold text-gray-900">{item.amount}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
