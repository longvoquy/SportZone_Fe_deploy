"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { ScrollArea } from "../../components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import axiosInstance from "../../utils/axios/axiosPrivate";
import logger from "../../utils/logger";

interface Notification {
  id: string;
  content: string;
  created_at: string;
  isRead?: boolean;
  url: string;
}

interface NotificationBellProps {
  userId: string | null;
  variant?: "default" | "sidebar";
  iconClassName?: string;
  /** Callback when a new notification is received via socket */
  onNotificationReceived?: (notification: { id: string; message: string; type?: string }) => void;
}

export function NotificationBell({
  userId,
  variant = "default",
  iconClassName,
  onNotificationReceived,
}: NotificationBellProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Only create socket connection if userId exists
  const socket = useSocket(userId || "", "notifications");

  // Early return if no userId - don't render anything or make API calls
  if (!userId) {
    return null;
  }

  // Fetch all notifications on mount
  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const [notificationResponse, unreadResponse] = await Promise.all([
          axiosInstance.get(`/notifications/user/${userId}`),
          axiosInstance.get(`/notifications/user/${userId}/unread-count`)
        ]);

        const rawData = Array.isArray(notificationResponse.data)
          ? notificationResponse.data
          : notificationResponse.data.data || [];

        const notificationData: Notification[] = rawData.map((item: any) => ({
          id: item.id || item._id,
          content: item.message || item.title || item.content || "Thông báo mới",
          created_at: item.created_at || item.createdAt || new Date().toISOString(),
          isRead: item.isRead ?? false,
          url: item.url || "/notifications",
        }));

        setNotifications(notificationData);

        const unreadData = unreadResponse.data;
        const unreadCountValue = typeof unreadData === 'number'
          ? unreadData
          : (unreadData?.data ?? unreadData?.count ?? 0);

        setUnreadCount(unreadCountValue);
      } catch (error) {
        logger.error("Error fetching notifications:", error);
      }
    };
    fetchNotifications();
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    interface IncomingNotification {
      id?: string;
      _id?: string;
      title?: string;
      message?: string;
      createdAt?: string;
      created_at?: string;
      url?: string;
    }

    const handleNotification = (data: IncomingNotification) => {
      const notificationId = data?.id || data?._id;
      if (!notificationId) {
        logger.warn("Notification received without an id, skipping:", data);
        return;
      }

      const newNotification: Notification = {
        id: notificationId,
        content: data?.message || data?.title || "Bạn có thông báo mới!",
        created_at:
          data?.createdAt ||
          data?.created_at ||
          new Date().toISOString(),
        url: data?.url || "/notifications",
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast notification with styling
      toast.success(data?.message || data?.title || "Bạn có thông báo mới!", {
        description: "Nhấn để xem chi tiết",
        duration: 5000,
      });

      // Invoke callback if provided (e.g., for dashboard to refresh)
      if (onNotificationReceived) {
        onNotificationReceived({
          id: notificationId,
          message: data?.message || data?.title || "Bạn có thông báo mới!",
          type: (data as any)?.type,
        });
      }
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, userId, onNotificationReceived]);

  // Listen for in-app notifications broadcasted via localStorage (from chat websocket)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'inapp:notification' || !e.newValue) return;
      try {
        const data = JSON.parse(e.newValue);
        const notification: Notification = {
          id: data.id || `${Date.now()}`,
          content: data.message || data.title || 'Bạn có thông báo mới!',
          created_at: data.createdAt || new Date().toISOString(),
          url: data.url || '/notifications',
        };

        // Avoid duplicates by id
        setNotifications(prev => {
          if (prev.some(n => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
        toast(notification.content);
      } catch (err) {
        logger.error('Failed to parse inapp notification', err);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Also handle same-tab custom event from chat websocket
  useEffect(() => {
    const onCustom = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as any;
        if (!detail) return;
        const notification: Notification = {
          id: detail.id || `${Date.now()}`,
          content: detail.message || detail.title || 'Bạn có thông báo mới!',
          created_at: detail.createdAt || new Date().toISOString(),
          url: detail.url || '/notifications',
        };
        setNotifications(prev => {
          if (prev.some(n => n.id === notification.id)) return prev;
          return [notification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
        toast(notification.content);
      } catch (err) {
        logger.error('Failed to handle custom inapp:notification', err);
      }
    };
    window.addEventListener('inapp:notification', onCustom as EventListener);
    return () => window.removeEventListener('inapp:notification', onCustom as EventListener);
  }, []);

  const handleMarkAsRead = async () => {
    if (!userId) return;

    try {
      // Mark all notifications as read
      await axiosInstance.patch(`/notifications/user/${userId}/read-all`);

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      logger.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        // Mark individual notification as read
        await axiosInstance.patch(`/notifications/${notification.id}/read`);

        // Update local state
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification.id
              ? { ...notif, isRead: true }
              : notif
          )
        );

        // Decrease unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        logger.error("Error marking notification as read:", error);
      }
    }

    // Navigate to the notification URL
    if (notification.url) {
      if (notification.url.startsWith('http')) {
        window.location.href = notification.url;
      } else {
        navigate(notification.url);
      }
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "Vừa xong";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Vừa xong";

    try {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: vi,
      });
    } catch (error) {
      return "Vừa xong";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${variant === "sidebar"
            ? "text-primary-200 hover:text-white hover:bg-primary-700"
            : ""
            }`}
          title="Thông báo"
        >
          <Bell
            className={iconClassName || `h-5 w-5 ${variant === "sidebar" ? "text-primary-200" : ""}`}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="font-medium">Thông báo</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAsRead}
              className="text-xs"
            >
              Đánh dấu đã đọc
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={notification.url}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNotificationClick(notification);
                  }}
                  className={`flex flex-col border-b p-4 hover:bg-muted/50 cursor-pointer ${notification.isRead ? "bg-white" : "bg-gray-100 hover:rounded-xl"
                    }`}
                >
                  <p className="text-sm">{notification.content}</p>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {formatTime(notification.created_at)}
                  </span>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">
                Không có thông báo
              </p>
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2 text-center bg-gray-50">
          <Link
            to="/notifications"
            className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center justify-center py-1"
          >
            Xem thêm
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
