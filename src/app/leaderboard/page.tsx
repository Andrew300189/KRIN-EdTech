import Link from "next/link";
import { listPublicLeaderboard } from "@/modules/motivation/services/motivation.service";
import { LocalizedText } from "@/core/i18n/LocalizedText";

// A cached leaderboard can hide newly earned XP for five minutes.
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const learners = await listPublicLeaderboard();
  return <main className="mx-auto max-w-4xl px-6 py-14">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-blue-700"><LocalizedText id="leaderboard.eyebrow" fallback="Community" /></p><h1 className="mt-2 text-4xl font-bold text-slate-950"><LocalizedText id="leaderboard.title" fallback="XP leaderboard" /></h1><p className="mt-3 max-w-2xl text-slate-600"><LocalizedText id="leaderboard.intro" fallback="Rank is based on currently available XP from every reward. Spending or exchanging XP can change your place; KRIN Coins do not count." /></p></header>
    <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white"><ol>{learners.map((learner) => <li key={`${learner.rank}-${learner.displayName}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 last:border-0"><span className="font-bold text-blue-700">#{learner.rank}</span>{learner.publicProfileUsername ? <Link href={`/u/${encodeURIComponent(learner.publicProfileUsername)}`} className="font-semibold text-blue-700 hover:underline">{learner.displayName}</Link> : <span className="font-semibold text-slate-950">{learner.displayName}</span>}<span className="text-sm text-slate-600"><LocalizedText id="leaderboard.score" fallback={`${learner.experience.toLocaleString()} available XP`} values={{ xp: learner.experience.toLocaleString() }} /></span></li>)}{learners.length === 0 ? <li className="px-5 py-10 text-center text-slate-600"><LocalizedText id="leaderboard.empty" fallback="No learners are available in the leaderboard yet." /></li> : null}</ol></section>
    <p className="mt-6 text-sm text-slate-600"><Link href="/profile/settings/motivation" className="font-semibold text-blue-700 hover:underline"><LocalizedText id="leaderboard.optIn" fallback="You can change your leaderboard and profile visibility in motivation settings." /></Link></p>
  </main>;
}
