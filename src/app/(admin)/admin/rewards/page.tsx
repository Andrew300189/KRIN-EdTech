import { RewardRulesEditor } from "@/modules/motivation/components/RewardRulesEditor";
import { AdminRewardAdjustmentForm } from "@/modules/motivation/components/AdminMotivationForms";
import { listRewardRules } from "@/modules/motivation/services/motivation.service";
export default async function AdminRewardsPage() { const rules = await listRewardRules(); return <div><h1 className="text-3xl font-bold">Reward rules</h1><p className="mt-2 text-slate-600">Server-side XP and coin rules with per-event daily limits.</p><RewardRulesEditor initial={rules} /><AdminRewardAdjustmentForm /></div>; }
