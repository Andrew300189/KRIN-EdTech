import { useEffect, useState } from 'react';
import { fetchAnalyticsSeries, fetchAnalyticsStats } from './analytics.service';

export default function useAnalytics() {
  const [stats, setStats] = useState<any[]>([]);
  const [series, setSeries] = useState<any>({ revenue: [], growth: [], retention: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      const [statsResponse, seriesResponse] = await Promise.all([fetchAnalyticsStats(), fetchAnalyticsSeries()]);
      setStats(statsResponse.stats ?? []);
      setSeries(seriesResponse.data ?? { revenue: [], growth: [], retention: [] });
      setLoading(false);
    }

    loadAnalytics();
  }, []);

  return { stats, series, loading };
}
