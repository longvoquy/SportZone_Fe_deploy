"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "@/store/hook";
import { CoachDashboardLayout } from "@/components/layouts/coach-dashboard-layout";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, User, FileText, AlertCircle, CalendarIcon, Search, MessageCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { TransactionStatus } from "@/components/enums/ENUMS";
import { formatCurrency } from "@/utils/format-currency";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import axiosPrivate from "@/utils/axios/axiosPrivate";
import logger from "@/utils/logger";

// Helper function to format date from YYYY-MM-DD to Vietnamese format
const formatDate = (dateStr: string): string => {
    try {
        const date = parseISO(dateStr);
        return format(date, "EEEE, d 'Tháng' M", { locale: vi });
    } catch {
        return dateStr;
    }
};

// Helper function to format time from HH:mm to 12-hour format
const formatTime = (time24h: string): string => {
    try {
        const [hours, minutes] = time24h.split(":");
        const hour = parseInt(hours, 10);
        const period = hour >= 12 ? "PM" : "AM";
        const hour12 = hour % 12 || 12;
        return `${hour12.toString().padStart(2, "0")}:${minutes} ${period}`;
    } catch {
        return time24h;
    }
};

interface MappedBooking {
    id: string;
    customerName: string;
    customerPhone: string;
    fieldName: string;
    fieldAddress: string;
    date: string;
    time: string;
    payment: string;
    status: "awaiting" | "accepted" | "rejected";
    statusText: string;
    originalBooking: any;
    transactionStatus?: string;
    coachStatus?: string;
    note?: string;
    type: 'coach' | 'field_coach';
}

// Helper function to map booking to UI format - matches field owner's approach
const mapBookingToUI = (booking: any, type: 'coach' | 'field_coach'): MappedBooking => {
    const startTime12h = formatTime(booking.startTime);
    const endTime12h = formatTime(booking.endTime);
    const bookingDate = booking.date ? formatDate(booking.date) : '';

    // Priority for coach: check coachStatus first for pending requests
    if (booking.coachStatus === 'pending') {
        return {
            id: booking._id || booking.id,
            customerName: booking.user?.fullName || 'N/A',
            customerPhone: booking.user?.phoneNumber || '',
            fieldName: booking.field?.name || 'N/A',
            fieldAddress: booking.field?.location?.address || booking.field?.location || '',
            date: bookingDate,
            time: `${startTime12h} - ${endTime12h}`,
            payment: formatCurrency(booking.totalPrice || 0, "VND"),
            status: "awaiting" as const,
            statusText: "Chờ Duyệt",
            originalBooking: booking,
            transactionStatus: booking.transactionStatus,
            coachStatus: booking.coachStatus,
            note: booking.note,
            type,
        };
    }

    // Map based on transactionStatus or status
    const transactionStatus = booking.transactionStatus || booking.status;
    let status: "awaiting" | "accepted" | "rejected" = "awaiting";
    let statusText = "Chờ Xác Nhận";

    switch (transactionStatus) {
        case TransactionStatus.PENDING:
            status = "awaiting";
            statusText = "Đang Chờ";
            break;
        case TransactionStatus.PROCESSING:
            status = "awaiting";
            statusText = "Đang Xử Lý";
            break;
        case TransactionStatus.SUCCEEDED:
            status = "accepted";
            statusText = "Thành Công";
            break;
        case TransactionStatus.FAILED:
            status = "rejected";
            statusText = "Thất Bại";
            break;
        case TransactionStatus.CANCELLED:
            status = "rejected";
            statusText = "Đã Hủy";
            break;
        case TransactionStatus.REFUNDED:
            status = "rejected";
            statusText = "Đã Hoàn Tiền";
            break;
        default:
            // Fallback to booking status for backward compatibility
            switch (booking.status) {
                case "pending":
                    status = "awaiting";
                    statusText = "Chờ Xác Nhận";
                    break;
                case "confirmed":
                    status = "accepted";
                    statusText = "Đã Chấp Nhận";
                    break;
                case "cancelled":
                    status = "rejected";
                    statusText = "Đã Hủy";
                    break;
                case "completed":
                    status = "accepted";
                    statusText = "Đã Hoàn Thành";
                    break;
            }
            // Also check coachStatus for declined
            if (booking.coachStatus === 'declined') {
                status = "rejected";
                statusText = "Đã Từ Chối";
            } else if (booking.coachStatus === 'accepted') {
                status = "accepted";
                statusText = "Đã Chấp Nhận";
            }
    }

    return {
        id: booking._id || booking.id,
        customerName: booking.user?.fullName || 'N/A',
        customerPhone: booking.user?.phoneNumber || '',
        fieldName: booking.field?.name || 'N/A',
        fieldAddress: booking.field?.location?.address || booking.field?.location || '',
        date: bookingDate,
        time: `${startTime12h} - ${endTime12h}`,
        payment: formatCurrency(booking.totalPrice || 0, "VND"),
        status,
        statusText,
        originalBooking: booking,
        transactionStatus: booking.transactionStatus,
        coachStatus: booking.coachStatus,
        note: booking.note,
        type,
    };
};

// Helper function to get date range from time filter
const getDateRangeFromTimeFilter = (timeFilter: string): { startDate?: string; endDate?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (timeFilter) {
        case "this-week": {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return {
                startDate: format(startOfWeek, "yyyy-MM-dd"),
                endDate: format(endOfWeek, "yyyy-MM-dd"),
            };
        }
        case "this-month": {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return {
                startDate: format(startOfMonth, "yyyy-MM-dd"),
                endDate: format(endOfMonth, "yyyy-MM-dd"),
            };
        }
        case "last-month": {
            const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            return {
                startDate: format(startOfLastMonth, "yyyy-MM-dd"),
                endDate: format(endOfLastMonth, "yyyy-MM-dd"),
            };
        }
        case "all":
        default:
            return {};
    }
};

const getStatusBadgeStyles = (status: MappedBooking["status"]) => {
    switch (status) {
        case "awaiting":
            return "bg-violet-100 text-violet-600 hover:bg-violet-200";
        case "accepted":
            return "bg-green-100 text-green-600 hover:bg-green-200";
        case "rejected":
            return "bg-red-100 text-red-600 hover:bg-red-200";
        default:
            return "";
    }
};

const convertTo24Hour = (time12h: string): string => {
    const parts = time12h.split(" - ");
    if (parts.length !== 2) return time12h;

    const convertSingleTime = (timeStr: string): string => {
        const trimmed = timeStr.trim();
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) return trimmed;

        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const period = timeMatch[3].toUpperCase();

        if (period === "PM" && hours !== 12) {
            hours += 12;
        } else if (period === "AM" && hours === 12) {
            hours = 0;
        }

        return `${hours.toString().padStart(2, "0")}:${minutes}`;
    };

    return `${convertSingleTime(parts[0])} - ${convertSingleTime(parts[1])}`;
};

export default function CoachBookingsPage() {
    const authUser = useAppSelector((state) => state.auth.user);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coachId, setCoachId] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [searchQuery, setSearchQuery] = useState("");
    const [timeFilter, setTimeFilter] = useState("all");
    const [bookingTypeTab, setBookingTypeTab] = useState<'coach' | 'field_coach'>('coach');



    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) return;

        const user = JSON.parse(storedUser);
        if (!user?._id) return;

        axiosPrivate
            .get(`/profiles/coach-id/${user._id}`)
            .then((res) => {
                setCoachId(res.data?.data?.id);
            })
            .catch((err) => logger.error("Error fetching coach ID:", err));
    }, []);

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true);
            try {
                const type = bookingTypeTab === 'field_coach' ? 'field_coach' : 'coach';
                const response = await axiosPrivate.get(`/bookings/coach/my-bookings/by-type?type=${type}`);
                const data = response.data;
                const bookingsData = Array.isArray(data) ? data : (data.data || []);
                setBookings(Array.isArray(bookingsData) ? bookingsData : []);
                setError(null);
            } catch (err: any) {
                logger.error("Error fetching bookings:", err);
                const errorMessage = err.response?.data?.message || err.message || "Không thể tải danh sách đặt lịch";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        if (authUser) {
            fetchBookings();
        }
    }, [authUser, bookingTypeTab]);

    const handleCompleteBooking = async (bookingId: string) => {
        if (!coachId) return;

        try {
            await axiosPrivate.patch(
                `/bookings/coach/${coachId}/${bookingId}/complete`
            );

            setBookings((prev) =>
                prev.map((b) =>
                    (b._id || b.id) === bookingId
                        ? { ...b, status: "completed", transactionStatus: TransactionStatus.SUCCEEDED }
                        : b
                )
            );
        } catch (err) {
            logger.error("Complete booking failed", err);
        }
    };

    const handleAcceptBooking = async (bookingId: string) => {
        if (!coachId) return;

        try {
            // Backend expects PATCH /bookings/accept with body { coachId, bookingId }
            await axiosPrivate.patch('/bookings/accept', {
                coachId,
                bookingId
            });

            setBookings((prev) =>
                prev.map((b) =>
                    (b._id || b.id) === bookingId
                        ? { ...b, coachStatus: "accepted", status: "confirmed" }
                        : b
                )
            );
        } catch (err) {
            logger.error("Accept booking failed", err);
        }
    };

    const handleDeclineBooking = async (bookingId: string) => {
        if (!coachId) return;

        try {
            // Backend expects PATCH /bookings/decline with body { coachId, bookingId, reason? }
            await axiosPrivate.patch('/bookings/decline', {
                coachId,
                bookingId
            });

            setBookings((prev) =>
                prev.map((b) =>
                    (b._id || b.id) === bookingId
                        ? { ...b, status: "cancelled", coachStatus: "declined", transactionStatus: TransactionStatus.CANCELLED }
                        : b
                )
            );
        } catch (err) {
            logger.error("Decline booking failed", err);
        }
    };

    // Cancel an already confirmed booking (uses URL param endpoint)
    const handleCancelBooking = async (bookingId: string) => {
        if (!coachId) return;

        try {
            await axiosPrivate.patch(
                `/bookings/coach/${coachId}/${bookingId}/cancel`
            );

            setBookings((prev) =>
                prev.map((b) =>
                    (b._id || b.id) === bookingId
                        ? { ...b, status: "cancelled", transactionStatus: TransactionStatus.CANCELLED }
                        : b
                )
            );
        } catch (err) {
            logger.error("Cancel booking failed", err);
        }
    };

    const handleChat = (bookingId: string) => {
        logger.debug("Open chat for booking:", bookingId);
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleTimeFilterChange = (value: string) => {
        setTimeFilter(value);
        setCurrentPage(1);
    };

    const handleSortChange = (value: string) => {
        logger.debug("Sort:", value);
    };

    const handleTabChangeFromFilter = (value: string) => {
        setBookingTypeTab(value as 'coach' | 'field_coach');
        setCurrentPage(1);
    };

    // Map and filter bookings
    const mappedBookings = useMemo(() => {
        const { startDate, endDate } = getDateRangeFromTimeFilter(timeFilter);

        return bookings
            .map((b) => mapBookingToUI(b, bookingTypeTab))
            .filter((b) => {
                // Filter by search query
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matchesCustomer = b.customerName.toLowerCase().includes(query);
                    const matchesField = b.fieldName.toLowerCase().includes(query);
                    if (!matchesCustomer && !matchesField) return false;
                }

                // Filter by date range
                if (startDate && endDate) {
                    const bookingDate = b.originalBooking.date;
                    if (bookingDate < startDate || bookingDate > endDate) return false;
                }

                // Filter by transaction status tab
                const txStatus = b.transactionStatus || b.originalBooking.status;
                switch (activeTab) {
                    case TransactionStatus.PENDING:
                        return txStatus === 'pending' || b.coachStatus === 'pending';
                    case TransactionStatus.PROCESSING:
                        return txStatus === 'processing';
                    case TransactionStatus.SUCCEEDED:
                        return txStatus === 'succeeded' || b.originalBooking.status === 'completed' || b.originalBooking.status === 'confirmed';
                    case TransactionStatus.FAILED:
                        return txStatus === 'failed';
                    case TransactionStatus.CANCELLED:
                        return txStatus === 'cancelled' || b.originalBooking.status === 'cancelled' || b.coachStatus === 'declined';
                    case TransactionStatus.REFUNDED:
                        return txStatus === 'refunded';
                    default:
                        return true;
                }
            });
    }, [bookings, bookingTypeTab, searchQuery, timeFilter, activeTab]);

    // Pagination
    const paginatedBookings = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return mappedBookings.slice(start, start + itemsPerPage);
    }, [mappedBookings, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(mappedBookings.length / itemsPerPage);

    return (
        <CoachDashboardLayout>
            <div className="space-y-6">
                {/* Main Content Card */}
                <Card className="bg-white shadow-md rounded-none border-0 gap-0">
                    <CardHeader className="border-b">
                        <CardTitle className="text-xl font-semibold text-start">
                            Đặt Lịch Của Tôi
                        </CardTitle>
                        <p className="text-gray-600 text-base mt-1.5 text-start">
                            Quản lý và theo dõi tất cả các lịch đặt huấn luyện của bạn.
                        </p>

                        {/* Status Tabs */}
                        <div className="mt-4">
                            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TransactionStatus); setCurrentPage(1); }}>
                                <TabsList className="bg-gray-100 p-1">
                                    <TabsTrigger value={TransactionStatus.PENDING} className="data-[state=active]:bg-white">
                                        Đang Chờ
                                    </TabsTrigger>
                                    <TabsTrigger value={TransactionStatus.PROCESSING} className="data-[state=active]:bg-white">
                                        Đang Xử Lý
                                    </TabsTrigger>
                                    <TabsTrigger value={TransactionStatus.SUCCEEDED} className="data-[state=active]:bg-white">
                                        Thành Công
                                    </TabsTrigger>
                                    <TabsTrigger value={TransactionStatus.CANCELLED} className="data-[state=active]:bg-white">
                                        Đã Hủy
                                    </TabsTrigger>
                                    <TabsTrigger value={TransactionStatus.REFUNDED} className="data-[state=active]:bg-white">
                                        Hoàn Tiền
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Filters */}
                        <div className="mt-4 w-full bg-gray-50 rounded-md p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                {/* Left side - Time filter and Sort */}
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-gray-600 text-base">Sắp Xếp</span>
                                        <Select defaultValue="relevance" onValueChange={handleSortChange}>
                                            <SelectTrigger className="w-40 bg-white border-gray-200 rounded-md">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="relevance">Liên Quan</SelectItem>
                                                <SelectItem value="date-desc">Mới Nhất</SelectItem>
                                                <SelectItem value="date-asc">Cũ Nhất</SelectItem>
                                                <SelectItem value="price-desc">Giá Cao</SelectItem>
                                                <SelectItem value="price-asc">Giá Thấp</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Select defaultValue="all" onValueChange={handleTimeFilterChange}>
                                            <SelectTrigger className="w-36 bg-white border-gray-200 rounded-md">
                                                <div className="flex items-center gap-3.5">
                                                    <CalendarIcon className="h-[14px] w-[14px] text-gray-600" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="this-week">Tuần Này</SelectItem>
                                                <SelectItem value="this-month">Tháng Này</SelectItem>
                                                <SelectItem value="last-month">Tháng Trước</SelectItem>
                                                <SelectItem value="all">Tất Cả</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Right side - Search and Type tabs */}
                                <div className="flex items-center gap-3.5">
                                    <div className="relative w-64">
                                        <Input
                                            placeholder="Tìm Kiếm"
                                            className="bg-gray-100 border-0 pr-10"
                                            onChange={(e) => handleSearch(e.target.value)}
                                        />
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-900" />
                                    </div>

                                    <div className="bg-gray-100 rounded-lg p-2.5">
                                        <Tabs value={bookingTypeTab} onValueChange={handleTabChangeFromFilter}>
                                            <TabsList className="bg-transparent p-0 h-auto gap-2.5">
                                                <TabsTrigger
                                                    value="coach"
                                                    className="px-2.5 py-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-900 rounded-lg"
                                                >
                                                    HLV
                                                </TabsTrigger>
                                                <TabsTrigger
                                                    value="field_coach"
                                                    className="px-2.5 py-2 data-[state=active]:bg-emerald-700 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-900 rounded-lg"
                                                >
                                                    Sân + HLV
                                                </TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {/* Error State */}
                        {error && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Loading State */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loading size={32} />
                            </div>
                        ) : (
                            <>
                                {/* Empty State */}
                                {paginatedBookings.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">Không có đặt lịch nào</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            {searchQuery || timeFilter !== "all" || activeTab !== TransactionStatus.PENDING
                                                ? "Thử thay đổi bộ lọc để xem thêm kết quả"
                                                : "Bạn chưa có đặt lịch nào"}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Booking Table */}
                                        <div className="w-full bg-white">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-50 border-b">
                                                            <TableHead className="w-48 font-semibold text-gray-900 text-left py-4">
                                                                Khách Hàng
                                                            </TableHead>
                                                            <TableHead className="w-48 font-semibold text-gray-900 text-left py-4">
                                                                Ngày & Giờ
                                                            </TableHead>
                                                            <TableHead className="w-48 font-semibold text-gray-900 text-left py-4">
                                                                Sân
                                                            </TableHead>
                                                            <TableHead className="w-32 text-left font-semibold text-gray-900 py-4">
                                                                Thanh Toán
                                                            </TableHead>
                                                            <TableHead className="w-32 font-semibold text-gray-900 text-left py-4">
                                                                Trạng Thái
                                                            </TableHead>
                                                            <TableHead className="w-24 font-semibold text-gray-900 text-left py-4">
                                                                Chat
                                                            </TableHead>
                                                            <TableHead className="w-48 py-4">Hành Động</TableHead>
                                                            <TableHead className="w-32 font-semibold text-gray-900 text-left py-4">
                                                                Ghi Chú
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {paginatedBookings.map((booking) => (
                                                            <TableRow key={booking.id} className="border-b hover:bg-gray-50">
                                                                <TableCell className="py-3.5 text-left">
                                                                    <div className="flex items-center gap-2">
                                                                        <User className="h-4 w-4 text-gray-400" />
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium text-gray-900">{booking.customerName}</span>
                                                                            <span className="text-xs text-gray-500">{booking.customerPhone}</span>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3.5 text-left">
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Calendar className="h-3 w-3 text-gray-400" />
                                                                            <span className="text-gray-900">{booking.date}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Clock className="h-3 w-3 text-gray-400" />
                                                                            <span className="text-gray-900">{convertTo24Hour(booking.time)}</span>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3.5 text-left">
                                                                    <div className="text-sm">
                                                                        <p className="font-medium text-gray-900">{booking.fieldName}</p>
                                                                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{booking.fieldAddress}</p>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-5 text-left">
                                                                    <span className="text-base font-medium text-gray-900">
                                                                        {booking.payment}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="py-5 text-left">
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className={`${getStatusBadgeStyles(booking.status)} rounded-sm`}
                                                                    >
                                                                        {booking.statusText}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="py-6 text-left">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 p-0 h-auto font-normal gap-2"
                                                                        onClick={() => handleChat(booking.id)}
                                                                    >
                                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                                        Chat
                                                                    </Button>
                                                                </TableCell>
                                                                <TableCell className="py-5 text-left">
                                                                    {/* Show Accept/Reject for pending coach requests */}
                                                                    {(booking.coachStatus === 'pending' || booking.transactionStatus === 'pending') ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                type="button"
                                                                                variant="default"
                                                                                className="bg-green-600 hover:bg-green-700 text-white h-8"
                                                                                disabled={!coachId}
                                                                                onClick={() => handleAcceptBooking(booking.id)}
                                                                            >
                                                                                Chấp Nhận
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="default"
                                                                                className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                                                                disabled={!coachId}
                                                                                onClick={() => handleDeclineBooking(booking.id)}
                                                                            >
                                                                                Từ Chối
                                                                            </Button>
                                                                        </div>
                                                                    ) : booking.transactionStatus === 'succeeded' || booking.originalBooking.status === 'confirmed' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <Button
                                                                                type="button"
                                                                                variant="default"
                                                                                className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                                                                                disabled={!coachId}
                                                                                onClick={() => handleCompleteBooking(booking.id)}
                                                                            >
                                                                                Hoàn Thành
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="destructive"
                                                                                className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                                                                disabled={!coachId}
                                                                                onClick={() => handleCancelBooking(booking.id)}
                                                                            >
                                                                                Hủy Đặt
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-gray-500">Không có hành động</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-3.5 text-left">
                                                                    {booking.note ? (
                                                                        <div className="flex items-start gap-1 max-w-[150px]" title={booking.note}>
                                                                            <FileText className="h-3 w-3 text-gray-400 mt-1 flex-shrink-0" />
                                                                            <span className="text-sm truncate">{booking.note}</span>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-gray-400 text-xs">-</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between py-4">
                                            <div className="text-sm text-gray-500">
                                                Hiển thị {paginatedBookings.length} trên tổng số {mappedBookings.length} đặt lịch
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Trước
                                                </Button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                        <Button
                                                            key={page}
                                                            variant={currentPage === page ? "default" : "outline"}
                                                            size="sm"
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`w-8 h-8 p-0 ${currentPage === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                                        >
                                                            {page}
                                                        </Button>
                                                    ))}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Sau
                                                </Button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </CoachDashboardLayout>
    );
}
