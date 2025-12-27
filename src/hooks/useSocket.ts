// hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import logger from '@/utils/logger';

const API_URL = import.meta.env.VITE_API_URL;

type SocketKind = 'chat' | 'notifications';

// Helper function to get userId from storage (Cookie -> Session -> Local)
const getUserId = (): string | null => {
  try {
    if (typeof document === 'undefined') return null;

    // 1. Try Cookie (Single Source of Truth)
    const match = document.cookie.match(/user=([^;]+)/);
    if (match) {
      try {
        const userStr = decodeURIComponent(match[1]);
        const user = JSON.parse(userStr);
        if (user?._id) return user._id;
      } catch (e) {
        // Fall through if cookie is malformed
      }
    }

    // 2. Try sessionStorage (Fallback)
    const sessionUserStr = sessionStorage.getItem("user");
    if (sessionUserStr) {
      try {
        const user = JSON.parse(sessionUserStr);
        if (user?._id) return user._id;
      } catch { /* ignore */ }
    }

    // 3. Try localStorage (Fallback)
    const localUserStr = localStorage.getItem("user");
    if (localUserStr) {
      try {
        const user = JSON.parse(localUserStr);
        if (user?._id) return user._id;
      } catch { /* ignore */ }
    }
  } catch (error) {
    console.error("Error reading user ID from storage:", error);
  }
  return null;
};

// Global store for persistent socket instances
const socketStore: Record<string, Socket> = {};

/**
 * Resets all active socket connections.
 * Should be called during logout.
 */
export const disconnectAllSockets = () => {
  Object.entries(socketStore).forEach(([kind, socket]) => {
    logger.debug(`[useSocket] Disconnecting ${kind} socket globally`);
    socket.disconnect();
    delete socketStore[kind];
  });
};

/**
 * Generic socket hook that can connect to different namespaces.
 * Automatically reads userId from storage (cookie -> session -> local).
 * - chat:    `${API_URL}/chat`
 * - notifications: `${API_URL}/notifications`
 * 
 * Uses a singleton pattern per 'kind' to persist connection across page navigations.
 */
export const useSocket = (kind: SocketKind = 'notifications') => {
  const [socket, setSocket] = useState<Socket | null>(socketStore[kind] || null);

  useEffect(() => {
    // Read userId from storage
    const userId = getUserId();

    // ✅ Don't connect if userId is empty or invalid
    if (!userId || userId.trim() === '' || userId === 'null' || userId === 'undefined') {
      logger.warn(`[useSocket] Cannot connect to ${kind}: userId not found in cookie`);
      return;
    }

    if (!API_URL) {
      logger.error('[useSocket] VITE_API_URL is not defined');
      return;
    }

    // If socket already exists and is connected/connecting, just return it
    if (socketStore[kind] && (socketStore[kind].connected || socketStore[kind].active)) {
      if (socket !== socketStore[kind]) {
        setSocket(socketStore[kind]);
      }
      return;
    }

    const namespacePath = kind === 'chat' ? '/chat' : '/notifications';
    const url = `${API_URL.replace(/\/$/, '')}${namespacePath}`;

    logger.debug(`[useSocket] Connecting to ${kind} socket as user ${userId}`);

    const newSocket = io(url, {
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      logger.debug(`[useSocket] ✅ Connected to ${kind} socket as user ${userId}`);
    });

    newSocket.on('disconnect', (reason) => {
      logger.debug(`[useSocket] Disconnected from ${kind} socket. Reason: ${reason}`);
    });

    newSocket.on('connect_error', (error) => {
      logger.error(`[useSocket] ${kind} socket connect_error:`, error.message);
    });

    socketStore[kind] = newSocket;
    setSocket(newSocket);

    // PERSISTENCE: We don't disconnect on unmount to keep connection during page navigation
    return () => {
      // logger.debug(`[useSocket] Hook unmounting for ${kind}. Connection persists.`);
    };
  }, [kind, socket]);

  return socket;
};
