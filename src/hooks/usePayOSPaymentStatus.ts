import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch } from '@/store/hook';
import { queryPayOSTransaction } from '@/features/transactions/transactionsThunk';
import type { PayOSQueryResult } from '@/types/payment-type';
import logger from '@/utils/logger';

interface UsePayOSPaymentStatusOptions {
  orderCode: number | null;
  interval?: number; // Polling interval in milliseconds (default: 3000)
  enabled?: boolean; // Whether to enable polling (default: true)
}

interface UsePayOSPaymentStatusReturn {
  status: string | null;
  loading: boolean;
  error: string | null;
  queryResult: PayOSQueryResult | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to poll PayOS payment status
 * Automatically stops polling when payment reaches terminal state (PAID, CANCELLED, EXPIRED)
 */
export const usePayOSPaymentStatus = ({
  orderCode,
  interval = 3000,
  enabled = true,
}: UsePayOSPaymentStatusOptions): UsePayOSPaymentStatusReturn => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<PayOSQueryResult | null>(null);

  const checkStatus = useCallback(async () => {
    if (!orderCode) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await dispatch(queryPayOSTransaction(orderCode)).unwrap();
      
      setStatus(result.status);
      setQueryResult(result);
      setLoading(false);

      // Log status change
      logger.debug('[usePayOSPaymentStatus] Status updated:', result.status);

      // Return true if should continue polling
      return !['PAID', 'CANCELLED', 'EXPIRED'].includes(result.status);
    } catch (err: any) {
      logger.error('[usePayOSPaymentStatus] Error checking status:', err);
      setError(err.message || 'Failed to check payment status');
      setLoading(false);
      return false;
    }
  }, [orderCode, dispatch]);

  useEffect(() => {
    if (!orderCode || !enabled) {
      setLoading(false);
      return;
    }

    // Initial check
    checkStatus();

    // Setup polling
    const pollInterval = setInterval(async () => {
      const shouldContinue = await checkStatus();
      
      if (!shouldContinue) {
        logger.debug('[usePayOSPaymentStatus] Payment reached terminal state, stopping poll');
        clearInterval(pollInterval);
      }
    }, interval);

    return () => {
      clearInterval(pollInterval);
    };
  }, [orderCode, interval, enabled, checkStatus]);

  const refetch = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  return {
    status,
    loading,
    error,
    queryResult,
    refetch,
  };
};
