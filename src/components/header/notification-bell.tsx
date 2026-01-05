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

    const handleNotification = (data: any) => {
      const id = data.id || data._id;
      if (!id) return;

      const newNotification: Notification = {
        id,
        content: data.message || data.title || "Bạn có thông báo mới!",
        created_at: data.createdAt || new Date().toISOString(),
        url: data.url || "/notifications",
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      toast.success(newNotification.content, {
        description: "Nhấn để xem chi tiết",
        duration: 5000,
      });

      onNotificationReceived?.({
        id,
        message: newNotification.content,
        type: data.type,
      });
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, onNotificationReceived]);

  /* ---------------- Actions ---------------- */
  const markAllAsRead = async () => {
    try {
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
