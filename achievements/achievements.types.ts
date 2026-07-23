export interface Achievement {
  title: string;
  description: string;
  unlocked?: boolean;
}

export interface Badge {
  name: string;
  level: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
}
