import React, { useState } from 'react';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <form className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          placeholder="••••••••"
        />
      </div>
      <button className="w-full rounded-lg bg-green-600 px-4 py-2 text-white">Reset password</button>
    </form>
  );
}
