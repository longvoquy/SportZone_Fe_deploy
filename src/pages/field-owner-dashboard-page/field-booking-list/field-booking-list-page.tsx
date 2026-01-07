"use client";

import { useState, useEffect, useMemo } from "react";
import { FieldOwnerDashboardLayout } from "@/components/layouts/field-owner-dashboard-layout";
import { BookingFilters } from "./components/booking-filter";
import { BookingTable } from "./components/booking-table";
import { BookingPagination } from "./components/field-history-booking-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import CourtBookingDetails from "@/components/pop-up/court-booking-detail";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import {
    ownerAcceptBooking,
    ownerRejectBooking,
    ownerGetBookingDetail,
    getMyFieldsBookings,
} from "@/features/field/fieldThunk";
import type { FieldOwnerBooking } from "@/types/field-type";
import logger from "@/utils/logger";
import { formatCurrency } from "@/utils/format-currency";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { TransactionStatus } from "@/components/enums/ENUMS";

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

// Helper function to map API booking to UI format
const mapBookingToUI = (booking: FieldOwnerBooking) => {
    const startTime12h = formatTime(booking.startTime);
    const endTime12h = formatTime(booking.endTime);

    const transactionStatus = booking.transactionStatus || booking.status;
    let status: "awaiting" | "accepted" | "rejected" | "completed" = "awaiting";
    let statusText = "Chờ Xác Nhận";

    switch (transactionStatus) {
        case TransactionStatus.PENDING:
        case TransactionStatus.PROCESSING:
            status = "awaiting";
            statusText = "Đang Chờ";
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
                    status = "completed";
                    statusText = "Đã Hoàn Thành";
                    break;
            }
    }

    return {
        id: booking.bookingId,
        academyName: booking.fieldName,
        courtName: booking.courtName || (booking.courtNumber ? `Court ${booking.courtNumber}` : booking.fieldName),
        courtNumber: booking.courtNumber,
        academyImage: "/images/academies/default.jpg",
        date: formatDate(booking.date),
        time: `${startTime12h} - ${endTime12h}`,
        payment: formatCurrency(booking.totalPrice, "VND"),
        status,
        statusText,
        originalBooking: booking,
        transactionStatus: booking.transactionStatus,
        approvalStatus: booking.approvalStatus,
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

export default function FieldBookingListPage() {
    const dispatch = useAppDispatch();
    const {
        fieldOwnerBookings,
        fieldOwnerBookingsLoading,
        fieldOwnerBookingsError,
        fieldOwnerBookingsPagination,
    } = useAppSelector((state) => state.field);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>();
    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        action: 'accept' | 'cancel' | null;
        bookingId: string | null;
    }>({ open: false, action: null, bookingId: null });
    const [activeTab, setActiveTab] = useState<TransactionStatus>(TransactionStatus.PENDING);
    const [searchQuery, setSearchQuery] = useState("");
    const [timeFilter, setTimeFilter] = useState("all");
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);
    const [hasInitialData, setHasInitialData] = useState(false);

    // Load hidden IDs from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('ownerHiddenBookingIds');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setHiddenIds(parsed);
            }
        } catch (error) {
            logger.error("Error loading hidden booking IDs from localStorage", error);
        }
    }, []);

    // Persist hidden IDs
    useEffect(() => {
        try {
            localStorage.setItem('ownerHiddenBookingIds', JSON.stringify(hiddenIds));
        } catch (error) {
            logger.error("Error persisting hidden booking IDs to localStorage", error);
        }
    }, [hiddenIds]);

    // Listen for tab changes from sidebar
    useEffect(() => {
        const handleTabChange = (event: CustomEvent<{ tab: string }>) => {
            const tab = event.detail.tab as TransactionStatus;
            if (Object.values(TransactionStatus).includes(tab)) {
                setActiveTab(tab);
                setCurrentPage(1);
            }
        };

        window.addEventListener('booking-history-tab-change', handleTabChange as EventListener);
        return () => {
            window.removeEventListener('booking-history-tab-change', handleTabChange as EventListener);
        };
    }, []);

    // Fetch bookings
    const fetchBookings = (isInitial = false) => {
        const { startDate, endDate } = getDateRangeFromTimeFilter(timeFilter);

        dispatch(
            getMyFieldsBookings({
                fieldName: searchQuery || undefined,
                transactionStatus: activeTab,
                startDate,
                endDate,
                page: currentPage,
                limit: itemsPerPage,
                type: 'field', // Hard-coded for field-only bookings
            })
        ).then(() => {
            if (isInitial) setHasInitialData(true);
        });
    };

    // Fetch on mount and filter changes
    useEffect(() => {
        fetchBookings(true);
    }, [dispatch, activeTab, searchQuery, timeFilter, currentPage, itemsPerPage]);

    // Polling every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchBookings(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [activeTab, searchQuery, timeFilter, currentPage, itemsPerPage]);

    const handleViewDetails = async (bookingId: string) => {
        const booking = fieldOwnerBookings?.find(b => b.bookingId === bookingId);
        if (!booking) return;

        let note: string | undefined;
        let paymentProofImageUrl: string | undefined;
        let courtName: string | undefined;
        try {
            const res: any = await dispatch(ownerGetBookingDetail(bookingId)).unwrap();
            note = res?.note;
            if (res?.transaction?.paymentProofImageUrl) {
                paymentProofImageUrl = res.transaction.paymentProofImageUrl;
            }
            if (res?.court) {
                const court = typeof res.court === 'string' ? null : res.court;
                courtName = court?.name || (court?.courtNumber ? `Sân ${court.courtNumber}` : undefined);
            }
        } catch {
            // ignore detail fetch error
        }

        const startTime12h = formatTime(booking.startTime);
        const endTime12h = formatTime(booking.endTime);
        const bookingDate = formatDate(booking.date);

        const displayCourt = courtName || booking.courtName || (booking.courtNumber ? `Sân ${booking.courtNumber}` : booking.fieldName);

        setSelectedBooking({
            academy: booking.fieldName,
            court: displayCourt,
            bookedOn: bookingDate,
            bookingDate: bookingDate,
            bookingTime: `${startTime12h} - ${endTime12h}`,
            totalAmountPaid: formatCurrency(booking.totalPrice, "VND"),
            customer: booking.customer,
            amenities: booking.selectedAmenities,
            amenitiesFee: booking.amenitiesFee ? formatCurrency(booking.amenitiesFee, "VND") : "0 đ",
            originalBooking: booking,
            note,
            paymentProofImageUrl,
        });
        setIsDetailsOpen(true);
    };

    const handleAccept = (bookingId: string) => {
        setConfirmState({ open: true, action: 'accept', bookingId });
    };

    const handleCancel = (bookingId: string) => {
        setConfirmState({ open: true, action: 'cancel', bookingId });
    };

    const handleConfirmAction = async () => {
        const { action, bookingId } = confirmState;
        if (!bookingId || !action) return;

        try {
            if (action === 'accept') {
                await dispatch(ownerAcceptBooking(bookingId)).unwrap();
            } else {
                await dispatch(ownerRejectBooking({ bookingId })).unwrap();
            }

            setHiddenIds((prev) => Array.from(new Set([...prev, bookingId])));
            const { startDate, endDate } = getDateRangeFromTimeFilter(timeFilter);
            dispatch(
                getMyFieldsBookings({
                    fieldName: searchQuery || undefined,
                    transactionStatus: activeTab,
                    startDate,
                    endDate,
                    page: currentPage,
                    limit: itemsPerPage,
                    type: 'field',
                })
            );
        } catch (e) {
            logger.error(`${action} booking failed`, e);
        } finally {
            setConfirmState({ open: false, action: null, bookingId: null });
        }
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

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (items: number) => {
        setItemsPerPage(items);
        setCurrentPage(1);
    };

    const mappedBookings = useMemo(() => {
        const rows: FieldOwnerBooking[] = fieldOwnerBookings || [];
        const mapped = rows.map(mapBookingToUI);
        return mapped.filter((b) => !hiddenIds.includes(b.id));
    }, [fieldOwnerBookings, hiddenIds]);

    return (
        <FieldOwnerDashboardLayout>
            <div className="space-y-6">
                {/* Main Content Card */}
                <Card className="bg-white shadow-md rounded-none border-0 gap-0">
                    <CardHeader className="border-b">
                        <CardTitle className="text-xl font-semibold text-start">
                            Đặt Sân
                        </CardTitle>
                        <p className="text-gray-600 text-base mt-1.5 text-start">
                            Quản lý và theo dõi tất cả các đặt sân của bạn.
                        </p>
                        <div className="mt-4">
                            <BookingFilters
                                onSearch={handleSearch}
                                onTimeFilterChange={handleTimeFilterChange}
                                onSortChange={handleSortChange}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Error State */}
                        {fieldOwnerBookingsError && (
                            <Alert variant="destructive" className="mb-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {fieldOwnerBookingsError?.message || "Có lỗi xảy ra khi tải dữ liệu đặt chỗ"}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Loading State */}
                        {fieldOwnerBookingsLoading && !hasInitialData ? (
                            <div className="flex items-center justify-center py-12">
                                <Loading size={32} />
                            </div>
                        ) : (
                            <>
                                {/* Empty State */}
                                {mappedBookings.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500 text-lg">Không có đặt chỗ nào</p>
                                        <p className="text-gray-400 text-sm mt-2">
                                            {searchQuery || timeFilter !== "all" || activeTab !== TransactionStatus.PENDING
                                                ? "Thử thay đổi bộ lọc để xem thêm kết quả"
                                                : "Bạn chưa có đặt chỗ nào"}
                                        </p>
                                    </div>
                                ) : (
                                    <BookingTable
                                        bookings={mappedBookings}
                                        onViewDetails={handleViewDetails}
                                        onAccept={handleAccept}
                                        onDeny={handleCancel}
                                        onCancel={handleCancel}
                                    />
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Pagination */}
                {!fieldOwnerBookingsLoading && mappedBookings.length > 0 && (
                    <BookingPagination
                        currentPage={currentPage}
                        totalPages={fieldOwnerBookingsPagination?.totalPages || 1}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                )}
            </div>

            {/* Booking Details Modal */}
            <CourtBookingDetails
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                bookingData={selectedBooking}
            />

            <AlertDialog open={confirmState.open} onOpenChange={(open) => !open && setConfirmState(prev => ({ ...prev, open: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmState.action === 'accept' ? 'Xác nhận chấp nhận' : 'Xác nhận hành động'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmState.action === 'accept'
                                ? 'Bạn có chắc chắn muốn chấp nhận yêu cầu đặt chỗ này không?'
                                : 'Bạn có chắc chắn muốn thực hiện hành động này không? Hành động này không thể hoàn tác.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmAction}>
                            {confirmState.action === 'accept' ? 'Chấp nhận' : 'Xác nhận'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </FieldOwnerDashboardLayout>
    );
}
