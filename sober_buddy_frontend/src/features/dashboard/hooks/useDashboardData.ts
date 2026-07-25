import { useEffect, useState } from 'react';
import { fetchDashboardData, type DashboardData } from '../api/dashboard.api';

export function useDashboardData(
  userId: string | undefined,
  isSober: boolean,
  linkedUserIds: string[] = [],
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dashboardData = await fetchDashboardData(userId, isSober, linkedUserIds);
      setData(dashboardData);
    } catch {
      setError('dashboard_error_load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isSober, linkedUserIds.join(',')]);

  return { data, loading, error, refresh };
}
