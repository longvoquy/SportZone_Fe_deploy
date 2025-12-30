import React, { useState } from "react";
import { useAppDispatch } from "@/store/hook";
import { cancelRecurringGroup } from "@/features/booking/bookingThunk";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown, ChevronUp, XCircle, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Booking {
    _id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    totalPrice: number;
    court?: {
        name: string;
        courtNumber: number;
    };
}

interface RecurringGroupCardProps {
    groupId: string;
    bookings: Booking[];
    onGroupCancelled?: () => void;
}

/**
 * Turn 4 Feature 1: Recurring Group Card Component
 * Displays all bookings in a recurring group with option to cancel all
 */
export const RecurringGroupCard: React.FC<RecurringGroupCardProps> = ({
    groupId,
    bookings,
    onGroupCancelled
}) => {
    const dispatch = useAppDispatch();
    const [showDetails, setShowDetails] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const activeBookings = bookings.filter(
        b => b.status !== 'cancelled' && b.status !== 'completed'
    );

    const handleCancelGroup = async () => {
        if (!confirm(`Ban co chac muon huy tat ca ${activeBookings.length} booking?`)) {
            return;
        }

        setIsCancelling(true);
        try {
            const result = await dispatch(cancelRecurringGroup({
                groupId,
                cancellationReason: "Huy nhom dat san dinh ky"
            })).unwrap();

            toast.success(`Da huy ${result.cancelledCount} booking thanh cong`);
            onGroupCancelled?.();
        } catch (error: any) {
            toast.error(error.message || "Khong the huy nhom booking");
        } finally {
            setIsCancelling(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return format(new Date(dateStr), "EEEE, dd/MM/yyyy", { locale: vi });
        } catch {
            return dateStr;
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Cho xac nhan" },
            confirmed: { bg: "bg-green-100", text: "text-green-800", label: "Da xac nhan" },
            completed: { bg: "bg-blue-100", text: "text-blue-800", label: "Hoan thanh" },
            cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Da huy" }
        };
        const config = statusConfig[status] || statusConfig.pending;
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const totalAmount = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    return (
        <div className="border border-purple-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <CalendarDays className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Nhom dat san dinh ky</h3>
                        <p className="text-sm text-gray-600">
                            {activeBookings.length} / {bookings.length} booking con hoat dong
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="text-purple-600 hover:bg-purple-50"
                    >
                        {showDetails ? (
                            <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                An
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Chi tiet
                            </>
                        )}
                    </Button>
                    {activeBookings.length > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleCancelGroup}
                            disabled={isCancelling}
                            className="gap-1"
                        >
                            <XCircle className="w-4 h-4" />
                            {isCancelling ? "Dang huy..." : "Huy tat ca"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                <span>Tong: <strong className="text-gray-900">{totalAmount.toLocaleString('vi-VN')} VND</strong></span>
            </div>

            {/* Details */}
            {showDetails && (
                <div className="mt-4 pt-4 border-t border-purple-100 space-y-2 max-h-64 overflow-y-auto">
                    {bookings.map(booking => (
                        <div
                            key={booking._id}
                            className={`flex items-center justify-between p-3 rounded-lg ${booking.status === 'cancelled' ? 'bg-gray-50' : 'bg-white'
                                } border border-gray-100`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">
                                        {formatDate(booking.date)}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>{booking.startTime} - {booking.endTime}</span>
                                        {booking.court && (
                                            <span className="text-purple-600">
                                                San {booking.court.courtNumber || booking.court.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">
                                    {booking.totalPrice?.toLocaleString('vi-VN')} VND
                                </span>
                                {getStatusBadge(booking.status)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecurringGroupCard;
