import React from 'react';

export interface InvoiceProps {
  invoiceId: string;
  amount: string;
  date: string;
}

export default function Invoice({ invoiceId, amount, date }: InvoiceProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Invoice</p>
          <p className="font-semibold text-gray-900">{invoiceId}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{amount}</p>
          <p className="text-sm text-gray-500">{date}</p>
        </div>
      </div>
    </div>
  );
}
