"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvitationAcceptance({ token }: { token: string }) { const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter(); const accept = async () => { setBusy(true); setError(""); const r = await fetch(`/api/student/invitations/${token}/accept`, { method: "POST" }); const p = await r.json().catch(() => null); setBusy(false); if (!r.ok) { setError(p?.error ?? "Unable to accept invitation."); return; } router.replace("/student/homework"); router.refresh(); }; return <section className="max-w-xl rounded-2xl border bg-white p-8"><h2 className="text-3xl font-bold">Group invitation</h2><p className="mt-3 text-slate-600">Accept this invitation to join the teacher’s learning group and receive its courses and assignments.</p>{error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p> : null}<button type="button" onClick={() => void accept()} disabled={busy} className="mt-6 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Accepting…" : "Accept invitation"}</button></section>; }
