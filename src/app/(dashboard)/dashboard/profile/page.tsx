"use client";

import { useState } from "react";

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    name: "John Doe",
    email: "john@example.com",
    level: "Beginner",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Profile Settings</h2>

      <div className="bg-white p-6 rounded-lg shadow-sm max-w-2xl">
        <div className="space-y-4">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              className="form-control w-full"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control w-full"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>English Level</label>
            <select
              className="form-control w-full"
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: e.target.value })
              }
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <button className="btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
  );
}
