import { useEffect, useState } from 'react';
import { fetchBillingHistory, fetchPlans } from './payments.service';

export default function usePayments() {
  const [plans, setPlans] = useState<any[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      const [plansResponse, billingResponse] = await Promise.all([fetchPlans(), fetchBillingHistory()]);
      setPlans(plansResponse.plans ?? []);
      setBillingHistory(billingResponse.items ?? []);
      setLoading(false);
    }

    loadPayments();
  }, []);

  return { plans, billingHistory, loading };
}
