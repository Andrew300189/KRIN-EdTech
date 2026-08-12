import Link from "next/link";
import { listPublicLeaderboard } from "@/modules/motivation/services/motivation.service";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const learners = await listPublicLeaderboard();
  return <main className="mx-auto max-w-4xl px-6 py-14"><header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Community</p><h1 className="mt-2 text-4xl font-bold text-slate-950">Learner leaderboard</h1><p className="mt-3 max-w-2xl text-slate-600">A voluntary view of consistent learning. Only the first name, current level and XP of learners who opted in are visible.</p></header><section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"><ol>{learners.map((learner) => <li key={`${learner.rank}-${learner.displayName}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"><span className="font-bold text-blue-700">#{learner.rank}</span><span className="font-semibold text-slate-950">{learner.displayName}</span><span className="text-sm text-slate-600">Level {learner.level} · {learner.experience.toLocaleString()} XP</span></li>)}{learners.length === 0 ? <li className="px-5 py-10 text-center text-slate-600">No learners have opted in yet.</li> : null}</ol></section><p className="mt-6 text-sm text-slate-600">You can opt in or out at any time in <Link href="/profile/settings/motivation" className="font-semibold text-blue-700 hover:underline">motivation settings</Link>.</p></main>;
}
