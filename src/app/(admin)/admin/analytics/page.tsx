import { getPlatformAnalytics, listSuspiciousActivities } from "@/modules/motivation/services/motivation.service";
import { getSearchAnalyticsSummary } from "@/modules/search/services/search-analytics.service";
import { AdminSearchAnalyticsTools } from "@/modules/search/components/AdminSearchAnalyticsTools";

export default async function AdminAnalyticsPage() {
	const [analytics, suspicious, searchMetrics] = await Promise.all([
		getPlatformAnalytics(),
		listSuspiciousActivities(),
		getSearchAnalyticsSummary({ days: 30 }),
	]);

	const dailyTrend = searchMetrics.daily.slice(-14).map((row) => {
		const totalSearches = Math.max(0, row.totalSearches);
		const totalClicks = Math.max(0, row.totalClicks);
		const noResultSearches = Math.max(0, row.noResultSearches);
		const ctr = totalSearches ? Math.round((totalClicks / totalSearches) * 1000) / 10 : 0;
		const noResultRate = totalSearches ? Math.round((noResultSearches / totalSearches) * 1000) / 10 : 0;
		const date = new Date(row.day);
		const label = Number.isNaN(date.getTime()) ? String(row.day) : date.toISOString().slice(5, 10);
		return {
			label,
			totalSearches,
			ctr,
			noResultRate,
		};
	});

	const maxDailySearches = Math.max(1, ...dailyTrend.map((row) => row.totalSearches));

	return <div>
		<h1 className="text-3xl font-bold">Platform analytics</h1>

		<section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Active today", analytics.activeUsersDay], ["Active this week", analytics.activeUsersWeek], ["Lessons completed", analytics.lessonsCompleted], ["Average accuracy", `${analytics.accuracy}%`], ["XP issued", analytics.experienceAwarded], ["Coins issued", analytics.coinsAwarded], ["Achievements", analytics.achievements], ["Open flags", analytics.openSuspiciousActivities]].map(([label, value]) => <article key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section>

		<section className="mt-8 rounded-xl border bg-white p-5">
			<h2 className="text-xl font-bold">Search analytics (30 days)</h2>
			<div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<article className="rounded-lg border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Searches</p><p className="mt-1 text-xl font-bold">{searchMetrics.totals.totalSearches}</p></article>
				<article className="rounded-lg border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">Clicks</p><p className="mt-1 text-xl font-bold">{searchMetrics.totals.totalClicks}</p></article>
				<article className="rounded-lg border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">No results</p><p className="mt-1 text-xl font-bold">{searchMetrics.totals.noResultSearches}</p></article>
				<article className="rounded-lg border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">CTR</p><p className="mt-1 text-xl font-bold">{searchMetrics.totals.clickThroughRate}%</p></article>
				<article className="rounded-lg border bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">No result rate</p><p className="mt-1 text-xl font-bold">{searchMetrics.totals.noResultRate}%</p></article>
			</div>

			<div className="mt-5 grid gap-4 lg:grid-cols-2">
				<article className="rounded-lg border p-4">
					<h3 className="font-semibold">By context</h3>
					{searchMetrics.byContext.length ? <ul className="mt-3 space-y-2">{searchMetrics.byContext.map((row) => <li key={row.context} className="flex items-center justify-between text-sm"><span className="font-medium">{row.context}</span><span className="text-slate-600">{row.totalSearches} searches · CTR {row.clickThroughRate}% · Empty {row.noResultRate}%</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No data yet.</p>}
				</article>
				<article className="rounded-lg border p-4">
					<h3 className="font-semibold">Top query hashes</h3>
					{searchMetrics.topQueries.length ? <ul className="mt-3 space-y-2">{searchMetrics.topQueries.map((row) => <li key={row.queryHash} className="text-sm"><p className="font-medium text-slate-800">{row.query ?? "Hidden (low-frequency query)"}</p><p className="font-mono text-xs text-slate-700">{row.queryHash.slice(0, 20)}...</p><p className="text-slate-600">{row.searches} searches · {row.clicks} clicks · {row.noResults} empty</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No data yet.</p>}
				</article>
			</div>

			<AdminSearchAnalyticsTools defaultDays={30} />

			<article className="mt-4 rounded-lg border p-4">
				<h3 className="font-semibold">Daily trend (last 14 days)</h3>
				{dailyTrend.length ? <ul className="mt-3 space-y-2">{dailyTrend.map((row) => <li key={row.label} className="rounded-md border border-slate-100 p-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="w-14 font-medium text-slate-700">{row.label}</span><div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${Math.max(4, Math.round((row.totalSearches / maxDailySearches) * 100))}%` }} /></div><span className="w-24 text-right text-slate-700">{row.totalSearches} searches</span></div><p className="mt-1 text-xs text-slate-600">CTR {row.ctr}% · Empty {row.noResultRate}%</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No daily search data yet.</p>}
			</article>
		</section>

		<section className="mt-8"><h2 className="text-xl font-bold">Suspicious activity</h2>{suspicious.length ? <ul className="mt-4 space-y-3">{suspicious.map((event) => <li key={event.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-semibold">{event.type} · {event.severity}</p><p className="text-sm text-slate-700">{event.user.name} ({event.user.email}) · {event.createdAt.toLocaleString()}</p></li>)}</ul> : <p className="mt-3 text-slate-600">No open events.</p>}</section>
	</div>;
}
