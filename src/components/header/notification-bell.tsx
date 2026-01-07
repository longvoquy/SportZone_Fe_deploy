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
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import axiosInstance from "../../utils/axios/axiosPrivate";
import logger from "../../utils/logger";
import { useNotificationBanner } from "@/context/notification-banner-context";
import { type BannerNotification } from "@/types/notification-type";

interface Notification {
  id: string;
  content: string;
  created_at: string;
  isRead?: boolean;
  url: string;
}

type FilterType = "all" | "admin" | "non-admin";

interface NotificationBellProps {
  userId: string | null;
  variant?: "default" | "sidebar";
  iconClassName?: string;
  onNotificationReceived?: (notification: {
    id: string;
    message: string;
    type?: string;
  }) => void;
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
  const [filter, setFilter] = useState<FilterType>("all");
  const { showNotification: showBannerNotification } = useNotificationBanner();

  const socket = useSocket("notifications");

  if (!userId) return null;

  /* ---------------- Fetch notifications ---------------- */
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [listRes, unreadRes] = await Promise.all([
          axiosInstance.get(
            `/notifications/user/${userId}?type=${filter}`
          ),
          axiosInstance.get(
            `/notifications/user/${userId}/unread-count`
          ),
        ]);

        const raw = Array.isArray(listRes.data)
          ? listRes.data
          : listRes.data?.data || [];

        const mapped: Notification[] = raw.map((n: any) => ({
          id: n.id || n._id,
          content: n.message || n.title || n.content || "Thông báo mới",
          created_at: n.createdAt || n.created_at || new Date().toISOString(),
          isRead: n.isRead ?? false,
          url: n.url || "/notifications",
        }));

        setNotifications(mapped);

        const unread =
          typeof unreadRes.data === "number"
            ? unreadRes.data
            : unreadRes.data?.count || unreadRes.data?.data || 0;

        setUnreadCount(unread);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchNotifications();
  }, [userId, filter]);

  /* ---------------- Socket handling ---------------- */
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
      type?: string;
    }

    const handleNotification = (data: IncomingNotification) => {
      const notificationId = data?.id || data?._id;
      if (!notificationId) {
        logger.warn("Notification received without an id, skipping:", data);
        return;
      }

      const newNotification: Notification = {
        id: notificationId,
        content: data.message || data.title || "Bạn có thông báo mới!",
        created_at: data.createdAt || new Date().toISOString(),
        url: data.url || "/notifications",
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show banner notification instead of toast
      const bannerNotification: BannerNotification = {
        id: notificationId,
        title: data?.title || "Thông báo mới",
        message: data?.message || data?.title || "Bạn có thông báo mới!",
        type: data?.type || "admin_notifcation",
        url: data?.url || "/notifications",
        createdAt: data?.createdAt || data?.created_at || new Date().toISOString(),
      };

      showBannerNotification(bannerNotification);

      onNotificationReceived?.({
        id: notificationId,
        message: newNotification.content,
        type: data.type,
      });
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, userId, onNotificationReceived, showBannerNotification]);

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

        // Show banner notification
        const bannerNotification: BannerNotification = {
          id: notification.id,
          title: data.title || "Thông báo mới",
          message: notification.content,
          type: data.type || "admin_notifcation",
          url: notification.url,
          createdAt: notification.created_at,
        };
        showBannerNotification(bannerNotification);
      } catch (err) {
        logger.error('Failed to parse inapp notification', err);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [showBannerNotification]);

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

        // Show banner notification
        const bannerNotification: BannerNotification = {
          id: notification.id,
          title: detail.title || "Thông báo mới",
          message: notification.content,
          type: detail.type || "admin_notifcation",
          url: notification.url,
          createdAt: notification.created_at,
        };
        showBannerNotification(bannerNotification);
      } catch (err) {
        logger.error('Failed to handle custom inapp:notification', err);
      }
    };
    window.addEventListener('inapp:notification', onCustom as EventListener);
    return () => window.removeEventListener('inapp:notification', onCustom as EventListener);
  }, [showBannerNotification]);

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      // Mark all notifications as read
      await axiosInstance.patch(`/notifications/user/${userId}/read-all`);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await axiosInstance.patch(`/notifications/${n.id}/read`);
      setNotifications((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, isRead: true } : x
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (n.url.startsWith("http")) {
      window.location.href = n.url;
    } else {
      navigate(n.url);
    }
  };

  const formatTime = (date?: string) => {
    try {
      return formatDistanceToNow(new Date(date || ""), {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return "Vừa xong";
    }
  };

  /* ---------------- Render ---------------- */
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
        >
          <Bell className={iconClassName || "h-5 w-5"} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 bg-white text-black border shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="font-medium">Thông báo</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Đã đọc hết
            </Button>
          )}
        </div>

        {/* Filter */}
        <div className="flex justify-center gap-1 px-2 py-2 border-b bg-muted/30">
          {[
            { key: "all", label: "Tất cả" },
            { key: "non-admin", label: "Của bạn" },
            { key: "admin", label: "Hệ thống" },
          ].map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "ghost"}
              onClick={() => setFilter(f.key as FilterType)}
              className="h-7 px-3 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        <ScrollArea className="h-[300px]">
          {notifications.length ? (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`border-b p-4 cursor-pointer hover:bg-muted/50 ${n.isRead ? "bg-white" : "bg-gray-100"
                  }`}
              >
                <p className="text-sm">{n.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(n.created_at)}
                  </span>
                  {!n.isRead && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Không có thông báo
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-2 text-center">
          <Link
            to="/notifications"
            className="text-sm font-medium text-green-600 hover:text-green-700"
          >
            Xem thêm
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
