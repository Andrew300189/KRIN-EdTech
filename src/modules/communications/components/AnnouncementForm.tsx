"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementForm() {
  const router = useRouter(); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch("/api/admin/communications/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), message: form.get("message"), actionUrl: form.get("actionUrl") || undefined, publishNow: form.get("publishNow") === "on" }) }); const data = await response.json(); setMessage(response.ok ? "Announcement created." : data.error || "Unable to create announcement."); if (response.ok) { event.currentTarget.reset(); router.refresh(); } }
  return <form onSubmit={(event) => void submit(event)} className="mt-6 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">Create announcement</h2><label className="mt-4 block">Title<input required name="title" maxLength={180} className="mt-1 w-full rounded border p-2" /></label><label className="mt-4 block">Message<textarea required name="message" maxLength={4000} rows={4} className="mt-1 w-full rounded border p-2" /></label><label className="mt-4 block">Internal action URL (optional)<input name="actionUrl" placeholder="/pricing" className="mt-1 w-full rounded border p-2" /></label><label className="mt-4 flex items-center gap-2"><input type="checkbox" name="publishNow" /> Publish now</label><button className="mt-4 rounded bg-blue-700 px-4 py-2 font-semibold text-white">Save announcement</button>{message ? <p role="status" className="mt-3 text-sm">{message}</p> : null}</form>;
}
