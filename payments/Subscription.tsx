import React from 'react';

export interface SubscriptionProps {
  plan: string;
  status: string;
  renewsAt?: string;
}

export default function Subscription({ plan, status, renewsAt }: SubscriptionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Current subscription</h3>
      <div className="mt-4 space-y-2">
        <p className="text-gray-700">Plan: <span className="font-semibold">{plan}</span></p>
        <p className="text-gray-700">Status: <span className="font-semibold">{status}</span></p>
        {renewsAt && <p className="text-gray-700">Renews at: <span className="font-semibold">{renewsAt}</span></p>}
      </div>
    </section>
  );
}
