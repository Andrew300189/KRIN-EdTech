import { useEffect, useState } from 'react';
import { fetchAchievements, fetchLeaderboard } from './achievements.service';

export default function useAchievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAchievements() {
      const [achievementsResponse, leaderboardResponse] = await Promise.all([fetchAchievements(), fetchLeaderboard()]);
      setAchievements(achievementsResponse.items ?? []);
      setLeaderboard(leaderboardResponse.entries ?? []);
      setLoading(false);
    }

    loadAchievements();
  }, []);

  return { achievements, leaderboard, loading };
}
