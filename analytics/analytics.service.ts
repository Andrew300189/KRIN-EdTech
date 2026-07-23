import { analyticsApi } from './analytics.api';

export async function fetchAnalyticsStats() {
  return analyticsApi.getStats();
}

export async function fetchAnalyticsSeries() {
  return analyticsApi.getSeries();
}
