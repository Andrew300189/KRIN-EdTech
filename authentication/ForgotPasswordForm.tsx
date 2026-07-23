import React, { useState } from 'react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');

  return (
    <form className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="you@example.com"
        />
      </div>
      <button className="w-full rounded-lg bg-slate-800 px-4 py-2 text-white">Send reset link</button>
    </form>
  );
}
