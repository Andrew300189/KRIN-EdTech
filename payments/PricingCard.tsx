import React from 'react';

export interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  featured?: boolean;
}

export default function PricingCard({ title, price, description, featured = false }: PricingCardProps) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${featured ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
      <p className="mt-6 text-4xl font-bold text-gray-900">{price}</p>
      <button className={`mt-6 w-full rounded-lg px-4 py-2 ${featured ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}>
        Choose plan
      </button>
    </div>
  );
}
