import { useEffect, useState } from "react";
import logger from "@/utils/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, ChevronLeft, ChevronRight } from "lucide-react";
import axiosPublic from "@/utils/axios/axiosPublic";
import { formatDistanceToNow, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { useAppSelector } from "@/store/hook";

type FilterType = "all" | "admin" | "non-admin";

interface Notification {
    _id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type: "admin" | "non-admin";
    url?: string;
}

export default function NotificationsContent() {
    const { user } = useAppSelector((state) => state.auth);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);
    const [filter, setFilter] = useState<FilterType>("all");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    /* ---------------- Fetch notifications ---------------- */
    useEffect(() => {
        const fetchNotifications = async () => {
            const userId = user?._id;
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const res = await axiosPublic.get(
                    `/notifications/user/${userId}?type=${filter}`
                );
                const raw = Array.isArray(res.data)
                    ? res.data
                    : res.data?.data || res.data?.notifications || [];

                setNotifications(raw);
            } catch (err) {
                logger.error("Error fetching notifications", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [user, filter]);

    /* ---------------- Helpers ---------------- */
    const formatTime = (date?: string) => {
        if (!date) return "Vừa xong";
        const d = new Date(date);
        if (!isValid(d)) return "Không rõ thời gian";
        return formatDistanceToNow(d, { addSuffix: true, locale: vi });
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    /* ---------------- Actions ---------------- */
    const handleMarkAsRead = async (id: string) => {
        try {
            await axiosPublic.patch(`/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
            );
        } catch (err) {
            logger.error("Error marking notification as read", err);
        }
    };

    const handleMarkAllAsRead = async () => {
        setMarkingAll(true);
        try {
            await Promise.all(
                notifications
                    .filter((n) => !n.isRead)
                    .map((n) => axiosPublic.patch(`/notifications/${n._id}/read`))
            );
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (err) {
            logger.error("Error marking all as read", err);
        } finally {
            setMarkingAll(false);
        }
    };

    /* ---------------- Pagination ---------------- */
    const totalPages = Math.ceil(notifications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentNotifications = notifications.slice(
        startIndex,
        startIndex + itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                Đang tải thông báo...
            </div>
        );
    }

    /* ---------------- Render ---------------- */
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <Card>
                {/* Header */}
                <CardHeader className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            <CardTitle>Thông báo</CardTitle>
                            <Badge variant="outline">{notifications.length}</Badge>
                            {unreadCount > 0 && (
                                <Badge className="bg-red-500">{unreadCount} chưa đọc</Badge>
                            )}
                        </div>

                        {unreadCount > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={markingAll}
                                onClick={handleMarkAllAsRead}
                            >
                                <Check className="w-4 h-4 mr-1" />
                                Đánh dấu tất cả đã đọc
                            </Button>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2">
                        {[
                            { key: "all", label: "Tất cả" },
                            { key: "non-admin", label: "Của bạn" },
                            { key: "admin", label: "Hệ thống" },
                        ].map((f) => (
                            <Button
                                key={f.key}
                                size="sm"
                                variant={filter === f.key ? "default" : "outline"}
                                onClick={() => {
                                    setFilter(f.key as FilterType);
                                    setCurrentPage(1);
                                }}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                </CardHeader>

                {/* Content */}
                <CardContent className="space-y-3">
                    {currentNotifications.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                            Không có thông báo
                        </p>
                    ) : (
                        currentNotifications.map((n) => (
                            <div
                                key={n._id}
                                className={`border rounded-lg p-4 flex justify-between gap-4 ${n.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                                    }`}
                            >
                                <div className="flex-1">
                                    <p className="font-medium">{n.title}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {n.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatTime(n.createdAt)}
                                    </p>
                                </div>

                                {!n.isRead && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleMarkAsRead(n._id)}
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        Đã đọc
                                    </Button>
                                )}
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center pt-4 border-t">
                            <span className="text-sm text-muted-foreground">
                                Trang {currentPage} / {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
