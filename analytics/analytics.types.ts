export interface AnalyticsStat {
  title: string;
  value: string;
  change?: string;
}

export interface AnalyticsSeries {
  revenue: number[];
  growth: number[];
  retention: number[];
}
