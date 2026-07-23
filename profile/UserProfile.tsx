import React from 'react';

export interface UserProfileProps {
  name: string;
  email: string;
  bio?: string;
}

export default function UserProfile({ name, email, bio }: UserProfileProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Profile</h3>
      <div className="mt-4 space-y-2">
        <p className="text-lg font-medium text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">{email}</p>
        {bio && <p className="text-sm text-gray-500">{bio}</p>}
      </div>
    </section>
  );
}
