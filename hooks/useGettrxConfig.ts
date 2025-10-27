import { useState, useEffect } from 'react';
import { Config } from '@/constants/Config';

interface PaymentConfig {
  publishableKey: string;
  accountId: string;
  environment: 'sandbox' | 'live';
}

interface UseGettrxConfigResult {
  config: PaymentConfig | null;
  loading: boolean;
  error: string | null;
}

export function useGettrxConfig(organizationId: number): UseGettrxConfigResult {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConfig() {
      if (!organizationId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${Config.API_BASE_URL}/gettrx/payment-config/${organizationId}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to get payment config');
        }

        const data = await response.json();
        
        if (!data.success || !data.config) {
          throw new Error('Invalid payment configuration');
        }

        setConfig(data.config);
      } catch (err: any) {
        console.error('Error fetching GETTRX config:', err);
        setError(err.message || 'Failed to load payment system');
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, [organizationId]);

  return { config, loading, error };
}
