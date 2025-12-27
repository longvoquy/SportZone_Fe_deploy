import { useEffect, useState } from "react";
import logger from "@/utils/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, ChevronLeft, ChevronRight } from "lucide-react";
import axiosPublic from "@/utils/axios/axiosPublic";
import { formatDistanceToNow, isValid, subHours } from "date-fns";
import { vi } from "date-fns/locale";

interface Notification {
    _id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsContent() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        const fetchNotifications = async () => {
            const storedUser = sessionStorage.getItem("user");
            if (!storedUser) return;

            const user = JSON.parse(storedUser);
            const userId = user?._id;
            if (!userId) return;

            try {
                const res = await axiosPublic.get(`/notifications/user/${userId}`);
                setNotifications(res.data?.data || []);
            } catch (err) {
                logger.error("Error fetching notifications", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const formatNotificationTime = (createdAt?: string) => {
        if (!createdAt) return "Không rõ thời gian";

        let date = new Date(createdAt);
        if (!isValid(date)) return "Ngày không hợp lệ";

        date = subHours(date, 7);

        return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    };

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

    // Pagination calculations
    const totalPages = Math.ceil(notifications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentNotifications = notifications.slice(startIndex, endIndex);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p>Đang tải thông báo...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <Card className="shadow-md">
                <CardHeader className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        <CardTitle className="text-xl font-semibold">Thông báo</CardTitle>
                        <Badge variant="outline">{notifications.length} thông báo</Badge>
                        {unreadCount > 0 && (
                            <Badge variant="default" className="bg-red-500">
                                {unreadCount} chưa đọc
                            </Badge>
                        )}
                    </div>

                    {notifications.some((n) => !n.isRead) && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={markingAll}
                            onClick={handleMarkAllAsRead}
                            className="flex items-center gap-1"
                        >
                            <Check className="w-4 h-4" />
                            {markingAll ? "Đang xử lý..." : "Đánh dấu tất cả đã đọc"}
                        </Button>
                    )}
                </CardHeader>

                <CardContent className="space-y-3">
                    {notifications.length === 0 ? (
                        <p className="text-gray-500 text-center py-6">Không có thông báo nào.</p>
                    ) : (
                        <>
                            {currentNotifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`border p-4 rounded-lg flex justify-between items-start transition-colors ${notif.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                                        }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-start gap-2">
                                            {!notif.isRead && (
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium text-start">{notif.title}</p>
                                                <p className="text-sm text-gray-600 mt-1 text-start">{notif.message}</p>
                                                <p className="text-xs text-gray-400 mt-1 text-start">
                                                    {formatNotificationTime(notif.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {!notif.isRead && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleMarkAsRead(notif._id)}
                                            className="text-blue-600 hover:text-blue-800 ml-2"
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Đánh dấu đã đọc
                                        </Button>
                                    )}
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="text-sm text-gray-600">
                                        Hiển thị {startIndex + 1} - {Math.min(endIndex, notifications.length)} trong tổng số {notifications.length} thông báo
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePreviousPage}
                                            disabled={currentPage === 1}
                                            className="flex items-center gap-1"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Trước
                                        </Button>
                                        <span className="text-sm text-gray-600">
                                            Trang {currentPage} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNextPage}
                                            disabled={currentPage === totalPages}
                                            className="flex items-center gap-1"
                                        >
                                            Sau
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
