"use client";

/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Check, Crown, LoaderCircle, Plus, Send, Trash2, UserMinus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { shopAvatarDetails } from "@/modules/motivation/utils/shop-avatar";
import styles from "./PlayerTeamsPage.module.css";

type TeamUser = {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  avatarDisplayMode: string;
  equippedShopAvatar: string | null;
};

type TeamMember = {
  id: string;
  role: "OWNER" | "MEMBER";
  status: "PENDING" | "ACTIVE" | "DECLINED" | "REMOVED";
  joinedAt: string | null;
  user: TeamUser;
};

type PlayerTeam = {
  id: string;
  name: string;
  description: string | null;
  maxMembers: number;
  ownerId: string;
  owner: TeamUser;
  createdAt: string;
  currentMembership: { role: "OWNER" | "MEMBER"; status: TeamMember["status"] } | null;
  members: TeamMember[];
};

type TeamsPayload = { teams: PlayerTeam[]; invitations: PlayerTeam[] };

function initials(user: TeamUser) {
  return user.name.trim().slice(0, 2).toUpperCase() || user.username.slice(0, 2).toUpperCase();
}

function MemberAvatar({ user }: { user: TeamUser }) {
  const shopAvatar = user.avatarDisplayMode === "SHOP" ? shopAvatarDetails(user.equippedShopAvatar) : null;
  return <span className={styles.avatar} aria-label={`${user.name} avatar`}>
    {user.avatarDisplayMode !== "SHOP" && user.avatar ? <img src={user.avatar} alt="" /> : shopAvatar ? shopAvatar.glyph : initials(user)}
  </span>;
}

async function api<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => null) as { data?: T; error?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.error ?? "Something went wrong. Please try again.");
  return payload.data;
}

export function PlayerTeamsPage() {
  const [data, setData] = useState<TeamsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(8);
  const [inviteNames, setInviteNames] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    const next = await api<TeamsPayload>("/api/student/teams");
    setData(next);
  }, []);

  useEffect(() => {
    void refresh()
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Unable to load your teams."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const teamCount = data?.teams.length ?? 0;
  const pendingCount = data?.invitations.length ?? 0;
  const emptyCopy = useMemo(() => teamCount === 0 && pendingCount === 0, [pendingCount, teamCount]);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try {
      await action();
      await refresh();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("create", async () => api<PlayerTeam>("/api/student/teams", {
      method: "POST",
      body: JSON.stringify({ name, description, maxMembers }),
    }), "Team created. Invite your first player when you are ready.").then((created) => {
      if (!created) return;
      setName("");
      setDescription("");
      setMaxMembers(8);
      setCreateOpen(false);
    });
  }

  function invite(teamId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = inviteNames[teamId]?.trim() ?? "";
    if (!username) return;
    void run(`invite:${teamId}`, () => api(`/api/student/teams/${teamId}/members`, {
      method: "POST",
      body: JSON.stringify({ username }),
    }), `Invitation sent to @${username.replace(/^@/, "")}.`).then((invited) => {
      if (!invited) return;
      setInviteNames((current) => ({ ...current, [teamId]: "" }));
    });
  }

  if (loading) return <section className={styles.loading} aria-live="polite"><LoaderCircle size={22} className={styles.spinner} /> Loading teams…</section>;

  return <section className={styles.page}>
    <header className={styles.hero}>
      <div>
        <p className={styles.eyebrow}><Users size={15} /> Player teams</p>
        <h1>Learn together, at your pace.</h1>
        <p>Create a small team, invite registered players by username, and keep each other motivated.</p>
      </div>
      <button type="button" className={styles.createButton} onClick={() => setCreateOpen((open) => !open)} aria-expanded={createOpen}>
        {createOpen ? <X size={18} /> : <Plus size={18} />}{createOpen ? "Close" : "Create a team"}
      </button>
    </header>

    {createOpen ? <form className={styles.createPanel} onSubmit={createTeam}>
      <div className={styles.formTitle}><span className={styles.iconBadge}><Users size={18} /></span><div><h2>New team</h2><p>You are the owner. Teams can have 2–12 players.</p></div></div>
      <div className={styles.formGrid}>
        <label>Team name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="For example, Morning English" minLength={2} maxLength={48} required /></label>
        <label>Team size<select value={maxMembers} onChange={(event) => setMaxMembers(Number(event.target.value))}>{[2, 3, 4, 5, 6, 8, 10, 12].map((size) => <option key={size} value={size}>{size} players</option>)}</select></label>
        <label className={styles.wideField}>Short description <span>optional</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will your team focus on?" maxLength={240} /></label>
      </div>
      <div className={styles.formActions}><button type="button" onClick={() => setCreateOpen(false)} className={styles.quietButton}>Cancel</button><button type="submit" disabled={busy === "create"} className={styles.primaryButton}>{busy === "create" ? <LoaderCircle size={17} className={styles.spinner} /> : <Plus size={17} />}Create team</button></div>
    </form> : null}

    {pendingCount ? <section className={styles.invitationSection} aria-labelledby="team-invitations-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Waiting for you</p><h2 id="team-invitations-title">Team invitations</h2></div><span>{pendingCount}</span></div>
      <div className={styles.invitationGrid}>{data?.invitations.map((team) => <article className={styles.invitationCard} key={team.id}>
        <div className={styles.invitationIdentity}><MemberAvatar user={team.owner} /><div><strong>{team.name}</strong><span>Invited by @{team.owner.username}</span></div></div>
        <p>{team.description || "Join this team to learn and stay motivated together."}</p>
        <div className={styles.invitationActions}><button type="button" className={styles.declineButton} disabled={busy === `decline:${team.id}`} onClick={() => void run(`decline:${team.id}`, () => api(`/api/student/teams/${team.id}/members`, { method: "PATCH", body: JSON.stringify({ action: "decline" }) }), "Invitation declined.")}>Decline</button><button type="button" className={styles.primaryButton} disabled={busy === `accept:${team.id}`} onClick={() => void run(`accept:${team.id}`, () => api(`/api/student/teams/${team.id}/members`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }), `You joined ${team.name}.`)}>{busy === `accept:${team.id}` ? <LoaderCircle size={17} className={styles.spinner} /> : <Check size={17} />}Join team</button></div>
      </article>)}</div>
    </section> : null}

    <section aria-labelledby="my-teams-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Your circle</p><h2 id="my-teams-title">My teams</h2></div>{teamCount ? <span>{teamCount}</span> : null}</div>
      {emptyCopy ? <div className={styles.empty}><span className={styles.emptyIcon}><Users size={29} /></span><h2>Your first team starts here</h2><p>Create a team and send an invitation using a player’s @username. They decide whether to join.</p><button type="button" className={styles.primaryButton} onClick={() => setCreateOpen(true)}><Plus size={17} />Create a team</button></div> : null}
      <div className={styles.teamGrid}>{data?.teams.map((team) => {
        const isOwner = team.currentMembership?.role === "OWNER";
        const activeMembers = team.members.filter((member) => member.status === "ACTIVE");
        const pendingMembers = team.members.filter((member) => member.status === "PENDING");
        return <article className={styles.teamCard} key={team.id}>
          <header className={styles.teamHeader}><div><div className={styles.teamTitleLine}><h3>{team.name}</h3>{isOwner ? <span className={styles.ownerPill}><Crown size={13} />Owner</span> : null}</div><p>{team.description || "A focused learning team."}</p></div><span className={styles.memberCount}><Users size={16} />{activeMembers.length}/{team.maxMembers}</span></header>
          <div className={styles.memberList}>{activeMembers.map((member) => <div className={styles.memberRow} key={member.id}><MemberAvatar user={member.user} /><div className={styles.memberIdentity}><strong>{member.user.name}</strong><span>@{member.user.username}{member.role === "OWNER" ? " · owner" : ""}</span></div>{isOwner && member.role !== "OWNER" ? <button type="button" className={styles.removeButton} disabled={busy === `remove:${team.id}:${member.user.id}`} onClick={() => void run(`remove:${team.id}:${member.user.id}`, () => api(`/api/student/teams/${team.id}/members`, { method: "DELETE", body: JSON.stringify({ userId: member.user.id }) }), `${member.user.name} was removed from the team.`)} aria-label={`Remove ${member.user.name}`} title="Remove player"><UserMinus size={16} /></button> : null}</div>)}</div>
          {pendingMembers.length ? <p className={styles.pendingLine}>Pending: {pendingMembers.map((member) => `@${member.user.username}`).join(", ")}</p> : null}
          {isOwner ? <form className={styles.inviteForm} onSubmit={(event) => invite(team.id, event)}><label htmlFor={`invite-${team.id}`}>Invite by username</label><div><input id={`invite-${team.id}`} value={inviteNames[team.id] ?? ""} onChange={(event) => setInviteNames((current) => ({ ...current, [team.id]: event.target.value }))} placeholder="@player" maxLength={64} /><button type="submit" disabled={busy === `invite:${team.id}`} title="Send invitation">{busy === `invite:${team.id}` ? <LoaderCircle size={17} className={styles.spinner} /> : <Send size={17} />}<span>Invite</span></button></div></form> : <button type="button" className={styles.leaveButton} disabled={busy === `leave:${team.id}`} onClick={() => void run(`leave:${team.id}`, () => api(`/api/student/teams/${team.id}/members`, { method: "DELETE", body: JSON.stringify({ action: "leave" }) }), "You left the team.")}><Trash2 size={16} />Leave team</button>}
        </article>;
      })}</div>
    </section>
  </section>;
}
