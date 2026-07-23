import React, { useState } from 'react';

export default function EditProfile() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-900">Edit profile</h3>
      <div className="mt-4 space-y-4">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Full name" />
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2" rows={4} placeholder="Short bio" />
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save changes</button>
      </div>
    </section>
  );
}
