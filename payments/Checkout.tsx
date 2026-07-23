import React from 'react';

export default function Checkout() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Checkout</h3>
      <form className="mt-4 space-y-4">
        <input className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Card number" />
        <div className="grid gap-4 md:grid-cols-2">
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="MM/YY" />
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="CVC" />
        </div>
        <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-white">Pay now</button>
      </form>
    </section>
  );
}
