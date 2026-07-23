import { achievementsApi } from './achievements.api';

export async function fetchAchievements() {
  return achievementsApi.list();
}

export async function fetchLeaderboard() {
  return achievementsApi.leaderboard();
}
