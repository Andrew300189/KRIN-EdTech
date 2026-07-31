"use client";

import { useCallback, useEffect, useState } from "react";

type Ticket = {
  id: string; number: string; subject: string; status: string; priority: string;
  user: { name: string; email: string };
  messages: { id: string; body: string; kind: string; isInternal: boolean; createdAt: string; author: { name: string; email: string } }[];
};
const statuses = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"];

export function AdminSupportConversation({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/support/tickets/${ticketId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to load ticket."); return; }
    setTicket(data.ticket);
  }, [ticketId]);
  useEffect(() => { void load(); }, [load]);
  async function reply(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/admin/support/tickets/${ticketId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, internal }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to reply."); return; }
    setBody(""); void load();
  }
  async function changeStatus(status: string) {
    const response = await fetch(`/api/admin/support/tickets/${ticketId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Unable to change status."); return; }
    void load();
  }
  if (!ticket) return <p className="mt-6 text-slate-600">Loading support ticket…</p>;
  return <section className="mt-6">
    <header className="rounded-xl border bg-white p-5">
      <p className="text-sm font-semibold text-blue-700">{ticket.number}</p>
      <h1 className="mt-1 text-3xl font-bold">{ticket.subject}</h1>
      <p className="mt-2 text-sm text-slate-600">{ticket.user.name} · {ticket.user.email} · {ticket.priority}</p>
      <div className="mt-4 flex flex-wrap gap-2">{statuses.map((status) => <button key={status} type="button" disabled={ticket.status === status} onClick={() => void changeStatus(status)} className="rounded border px-3 py-2 text-xs font-semibold disabled:bg-slate-100">{status.replace(/_/g, " ")}</button>)}</div>
    </header>
    <div className="mt-5 space-y-3">{ticket.messages.map((message) => <article key={message.id} className={`rounded-xl border p-4 ${message.isInternal ? "border-amber-300 bg-amber-50" : message.kind === "AGENT_REPLY" ? "border-blue-200 bg-blue-50" : "bg-white"}`}><p className="font-semibold">{message.author.name}{message.isInternal ? " · internal note" : ""}</p><p className="mt-2 whitespace-pre-wrap">{message.body}</p><p className="mt-2 text-xs text-slate-500">{new Date(message.createdAt).toLocaleString()}</p></article>)}</div>
    <form onSubmit={(event) => void reply(event)} className="mt-5 rounded-xl border bg-white p-5">
      <label className="block font-medium">Reply or internal note<textarea required value={body} onChange={(event) => setBody(event.target.value)} maxLength={8000} rows={5} className="mt-2 w-full rounded border p-3" /></label>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} /> Internal note — not visible to the requester</label>
      <button className="mt-3 rounded bg-blue-700 px-4 py-2 font-semibold text-white">Send</button>
    </form>
    {error ? <p role="alert" className="mt-4 text-red-700">{error}</p> : null}
  </section>;
}
