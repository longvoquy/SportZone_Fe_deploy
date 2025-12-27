import { io, Socket } from "socket.io-client";
import { store } from "@/store/store";
import { addMessage, setTyping, setConnected } from "./chatSlice";
import { BASE_URL } from "@/utils/constant-value/constant";
import logger from "@/utils/logger";

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect() {


    if (this.socket?.connected) {

      return;
    }

    // If stuck in connecting state, reset after checking actual socket state
    if (this.isConnecting && this.socket && !this.socket.connected) {
      logger.warn('[WebSocketService] Was in connecting state but socket not connected, resetting...');
      this.isConnecting = false;
    }

    if (this.isConnecting) {

      return;
    }

    // Get user data from cookie (Single Source of Truth)
    let userId: string | null = null;
    try {
      const match = document.cookie.match(/user=([^;]+)/);
      if (match) {
        const userStr = decodeURIComponent(match[1]);
        const user = JSON.parse(userStr);
        userId = user?._id || null;
      }
    } catch (e) {
      logger.error("[WebSocketService] Failed to parse user from cookie", e);
    }

    if (!userId) {
      // Fallback to storage if cookie not found yet
      const userData = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user?._id || null;
        } catch { /* ignore */ }
      }
    }

    if (!userId) {
      logger.error("[WebSocketService] No user ID found in cookie or storage");
      return;
    }



    this.isConnecting = true;

    // Safety timeout: reset isConnecting after 10 seconds if still not connected
    setTimeout(() => {
      if (this.isConnecting && !this.socket?.connected) {
        logger.warn('[WebSocketService] Connection timeout, resetting isConnecting flag');
        this.isConnecting = false;
      }
    }, 10000);

    const apiUrl = BASE_URL;
    this.socket = io(`${apiUrl}/chat`, {
      auth: { userId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {

      store.dispatch(setConnected(true));
      this.isConnecting = false;
    });

    this.socket.on("disconnect", () => {

      store.dispatch(setConnected(false));
      this.isConnecting = false;
    });

    this.socket.on("connect_error", (error) => {
      logger.error("[WebSocketService] Connection error:", error);
      this.isConnecting = false;
    });

    // Listen for messages
    this.socket.on("new_message", (data) => {

      store.dispatch(addMessage(data));
    });

    this.socket.on("user_typing", (data) => {
      store.dispatch(setTyping(data));
    });

    this.socket.on("messages_read", () => {
      // Handle read receipt

    });

    this.socket.on("message_notification", (data) => {
      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification("New Message", {
          body: data.message.content,
          icon: "/favicon.ico",
        });
      }
    });
  }

  disconnect() {

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
    store.dispatch(setConnected(false));
  }

  // Force reset for logout
  reset() {

    this.disconnect();
    this.socket = null;
    this.isConnecting = false;
  }

  joinChatRoom(chatRoomId: string) {
    if (this.socket?.connected) {

      this.socket.emit("join_chat", { chatRoomId });
    } else {
      logger.warn('[WebSocketService] Cannot join room - socket not connected');
    }
  }

  leaveChatRoom(chatRoomId: string) {
    if (this.socket?.connected) {

      this.socket.emit("leave_chat", { chatRoomId });
    } else {
      logger.warn('[WebSocketService] Cannot leave room - socket not connected');
    }
  }

  sendMessage(data: {
    fieldOwnerId: string;
    fieldId?: string;
    content: string;
    type?: string;
    attachments?: string[];
  }) {
    if (this.socket?.connected) {
      this.socket.emit("send_message", data);
    }
  }

  sendTyping(chatRoomId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit("typing", { chatRoomId, isTyping });
    }
  }

  markAsRead(chatRoomId: string) {
    if (this.socket?.connected) {
      this.socket.emit("read_messages", { chatRoomId });
    }
  }

  sendMessageToRoom(chatRoomId: string, content: string, type: string = "text", attachments?: string[]) {


    if (this.socket?.connected) {

      this.socket.emit("send_message_to_room", { chatRoomId, content, type, attachments });
    } else {
      logger.error('[WebSocketService] Socket not connected!', {
        hasSocket: !!this.socket,
        connected: this.socket?.connected,
      });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const webSocketService = new WebSocketService();