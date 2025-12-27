import { useCallback, useEffect, useRef, useState } from "react";
import { getEkycStatus } from "@/features/field-owner-registration/registrationAPI";
import logger from "@/utils/logger";

export interface EkycData {
  fullName: string;
  idNumber: string;
  address: string;
}

export type EkycPollingStatus =
  | "idle"
  | "polling"
  | "verified"
  | "failed"
  | "timeout";

export interface UseEkycPollingReturn {
  status: EkycPollingStatus;
  data: EkycData | null;
  error: string | null;
  startPolling: (sessionId: string) => void;
  stopPolling: () => void;
}

const MAX_ATTEMPTS = 120; // ~6 minutes with 3s interval
const POLL_INTERVAL = 3000;

export const useEkycPolling = (): UseEkycPollingReturn => {
  const [status, setStatus] = useState<EkycPollingStatus>("idle");
  const [data, setData] = useState<EkycData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const clearPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    attemptsRef.current = 0;
  }, []);

  const stopPolling = useCallback(() => {
    clearPolling();
    // Only reset to idle if currently polling
    setStatus((currentStatus) => {
      if (currentStatus === "polling") {
        return "idle";
      }
      return currentStatus;
    });
  }, [clearPolling]);

  const poll = useCallback(async () => {
    if (!sessionIdRef.current) {
      clearPolling();
      return;
    }

    // Don't poll if already in a terminal state
    if (intervalRef.current === null) {
      return;
    }

    try {
      const result = await getEkycStatus(sessionIdRef.current);

      if (result.status === "verified") {
        setStatus("verified");
        if (result.data) {
          setData({
            fullName: result.data.fullName,
            idNumber: result.data.idNumber,
            address: result.data.address,
          });
        }
        clearPolling();
        return;
      }

      if (result.status === "failed") {
        setStatus("failed");
        setError("Xác thực danh tính thất bại");
        clearPolling();
        return;
      }

      // pending -> continue polling
      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus("timeout");
        setError("Hết thời gian chờ. Vui lòng thử lại.");
        clearPolling();
        return;
      }
    } catch (err: any) {
      logger.error("Poll eKYC status error:", err);
      
      // Increment attempts on error too, to prevent infinite polling
      attemptsRef.current += 1;
      
      // Set error but don't stop polling immediately (network errors might be temporary)
      // Only stop if we've exceeded max attempts
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus("timeout");
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Hết thời gian chờ. Vui lòng thử lại.",
        );
        clearPolling();
      } else {
        // Set error but continue polling
        setError(
          err?.response?.data?.message ??
            err?.message ??
            "Lỗi khi kiểm tra trạng thái xác thực",
        );
      }
    }
  }, [clearPolling]);

  const startPolling = useCallback(
    (sessionId: string) => {
      // Clear any existing polling first
      clearPolling();

      // Reset state
      sessionIdRef.current = sessionId;
      setStatus("polling");
      setError(null);
      setData(null);
      attemptsRef.current = 0;

      // Trigger first poll immediately
      void poll();

      // Schedule interval for subsequent polls
      intervalRef.current = window.setInterval(poll, POLL_INTERVAL);
    },
    [poll, clearPolling],
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    status,
    data,
    error,
    startPolling,
    stopPolling,
  };
};

