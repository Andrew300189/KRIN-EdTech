import React from "react";

export default function VerifyEmail() {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-gray-900">Verify your email</h3>
      <p className="text-sm text-gray-600">
        We sent a confirmation link to your inbox. Please open it to continue.
      </p>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">
        Resend email
      </button>
    </div>
  );
}
