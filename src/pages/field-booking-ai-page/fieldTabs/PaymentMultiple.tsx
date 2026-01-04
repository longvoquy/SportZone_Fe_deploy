import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Wallet, Calendar, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import type { Field } from "@/types/field-type";
import type { BookingFormData } from "../../field-booking-page/fieldTabs/personalInfo";
import { toast } from "sonner";
import logger from "@/utils/logger";
import { createPayOSPayment, createPayOSPaymentRecurring } from "@/features/booking/bookingThunk";
import { useSocket } from "@/hooks/useSocket";
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

// Helper function for formatting VND
const formatVND = (value: number): string => {
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    } catch {
        return `${value.toLocaleString('vi-VN')} d`;
    }
};

/**
 * Props for PaymentMultiple component
 */
interface PaymentMultipleProps {
    bookingData?: BookingFormData;
    aiBookingType: 'consecutive' | 'weekly';
    onBack?: () => void;
    onPaymentComplete?: () => void;
    onRestart?: () => void;
}

/**
 * PaymentMultiple component - Payment flow for AI/Multiple bookings
 * Bookings are ALREADY created in PersonalInfoAi step
 * This component only handles PayOS payment
 */
export const PaymentMultiple: React.FC<PaymentMultipleProps> = ({
    bookingData,
    aiBookingType,
    onBack,
    onPaymentComplete,
    onRestart,
}) => {
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField) as Field | undefined;

    // Restore booking data from sessionStorage
    const [heldBookingId, setHeldBookingId] = useState<string | null>(null);
    const [bookingIds, setBookingIds] = useState<string[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [holdError, setHoldError] = useState<string | null>(null);

    // Payment state
    const [payosWindow, setPayosWindow] = useState<Window | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [pollAttempts, setPollAttempts] = useState(0);

    // Countdown timer state
    const [countdown, setCountdown] = useState<number>(300); // 5 minutes default

    // Cancel state
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // WebSocket for real-time payment notifications
    const socket = useSocket('notifications');

    // Restore booking data from sessionStorage on mount
    useEffect(() => {
        try {
            const storedBookingId = sessionStorage.getItem('heldBookingId');
            const storedBookingTime = sessionStorage.getItem('heldBookingTime');
            const storedBookingIds = sessionStorage.getItem('aiBookingIds');
            const storedSummary = sessionStorage.getItem('aiBookingSummary');

            if (!storedBookingId || storedBookingId === 'undefined' || storedBookingId === 'null') {
                setHoldError('Không tìm thấy thông tin booking. Vui lòng quay lại và thử lại.');
                return;
            }

            setHeldBookingId(storedBookingId);

            if (storedBookingIds) {
                try {
                    setBookingIds(JSON.parse(storedBookingIds));
                } catch { }
            }

            if (storedSummary) {
                try {
                    setSummary(JSON.parse(storedSummary));
                } catch { }
            }

            // Calculate remaining countdown
            if (storedBookingTime) {
                const holdTime = parseInt(storedBookingTime, 10);
                const elapsed = Math.floor((Date.now() - holdTime) / 1000);
                const remaining = Math.max(0, 300 - elapsed);
                setCountdown(remaining);

                if (remaining === 0) {
                    setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');
                }
            }

            logger.debug('[PAYMENT MULTIPLE] Restored booking:', { storedBookingId, bookingIds: storedBookingIds });

        } catch (error) {
            logger.error('[PAYMENT MULTIPLE] Error restoring booking data:', error);
            setHoldError('Lỗi khi khôi phục thông tin booking. Vui lòng quay lại và thử lại.');
        }
    }, []);

    // Clear session storage - defined before cancel handlers
    const clearBookingSession = useCallback(() => {
        try {
            sessionStorage.removeItem('heldBookingId');
            sessionStorage.removeItem('heldBookingTime');
            sessionStorage.removeItem('heldBookingCountdown');
            sessionStorage.removeItem('aiBookingIds');
            sessionStorage.removeItem('aiBookingSummary');
            sessionStorage.removeItem('aiBookingPayload');
            sessionStorage.removeItem('aiBookingType');
            sessionStorage.removeItem('bookingAiCurrentStep');
        } catch { }
    }, []);

    // Handle cancel recurring group booking
    const handleCancelBooking = useCallback(async () => {
        const groupId = summary?.recurringGroupId;
        if (!groupId && !heldBookingId) {
            onBack?.();
            return;
        }

        setIsCancelling(true);
        try {
            // Cancel the entire recurring group
            const cancelEndpoint = groupId
                ? `${import.meta.env.VITE_API_URL}/bookings/recurring-group/${groupId}/cancel`
                : `${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/cancel-hold`;

            const response = await fetch(cancelEndpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cancellationReason: 'Người dùng hủy đặt sân'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PAYMENT MULTIPLE] Error cancelling booking:', errorData);
                toast.error('Không thể hủy đặt sân. Vui lòng thử lại.');
            } else {
                logger.debug('[PAYMENT MULTIPLE] Booking cancelled successfully');
                toast.success(`Đã hủy ${bookingIds.length || 1} booking thành công`);
            }
        } catch (error) {
            logger.error('[PAYMENT MULTIPLE] Error cancelling booking:', error);
            toast.error('Có lỗi xảy ra khi hủy đặt sân');
        } finally {
            setIsCancelling(false);
            clearBookingSession();
            setHeldBookingId(null);
            setCountdown(0);
            setShowCancelDialog(false);
            onBack?.();
        }
    }, [summary, heldBookingId, bookingIds, onBack]);

    // Handle back button click - show confirmation dialog
    const handleBackClick = useCallback(() => {
        if (heldBookingId || bookingIds.length > 0) {
            setShowCancelDialog(true);
        } else {
            onBack?.();
        }
    }, [heldBookingId, bookingIds, onBack]);

    // Handle countdown expired - cancel booking and release slots
    const handleCountdownExpired = useCallback(async () => {
        const groupId = summary?.recurringGroupId;
        if (!groupId && !heldBookingId) return;

        try {
            const cancelEndpoint = groupId
                ? `${import.meta.env.VITE_API_URL}/bookings/recurring-group/${groupId}/cancel`
                : `${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/cancel-hold`;

            const response = await fetch(cancelEndpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cancellationReason: 'Thời gian giữ chỗ đã hết (5 phút)'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PAYMENT MULTIPLE] Error cancelling on countdown expiry:', errorData);
            } else {
                logger.debug('[PAYMENT MULTIPLE] Booking cancelled on countdown expiry');
            }
        } catch (error) {
            logger.error('[PAYMENT MULTIPLE] Error cancelling on countdown expiry:', error);
        }

        clearBookingSession();
        setHeldBookingId(null);
        setCountdown(0);
        setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');
        onRestart?.();
    }, [summary, heldBookingId, onRestart]);

    // Countdown timer
    useEffect(() => {
        if (countdown <= 0 || paymentSuccess || holdError) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleCountdownExpired();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [countdown, paymentSuccess, holdError, handleCountdownExpired]);

    // Format countdown
    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle PayOS payment initiation
    const handlePayWithPayOS = useCallback(async () => {
        if (!heldBookingId) {
            toast.error('Không tìm thấy booking để thanh toán');
            return;
        }

        try {
            // Check if it's recurring (AI booking with multiple items)
            const isRecurring = summary && summary.totalBookings > 1;

            // Choose appropriate endpoint
            const paymentAction = isRecurring
                ? createPayOSPaymentRecurring(heldBookingId)
                : createPayOSPayment(heldBookingId);

            const result = await dispatch(paymentAction).unwrap();

            if (result.checkoutUrl) {
                const paymentWindow = window.open(
                    result.checkoutUrl,
                    'PayOS Payment',
                    'width=800,height=900,left=200,top=100'
                );

                if (paymentWindow) {
                    setPayosWindow(paymentWindow);
                } else {
                    throw new Error('Không thể mở cửa sổ thanh toán. Vui lòng kiểm tra popup blocker.');
                }
            } else {
                throw new Error('Link thanh toán không tồn tại');
            }
        } catch (error: any) {
            logger.error('[PAYMENT MULTIPLE] PayOS Error:', error);
            toast.error(error.message || 'Lỗi khi khởi tạo thanh toán PayOS');
        }
    }, [heldBookingId, dispatch]);

    // WebSocket listener for payment success
    useEffect(() => {
        if (!socket || !heldBookingId || paymentSuccess) return;

        const handleNotification = (notification: any) => {
            const notificationBookingId = notification.metadata?.bookingId || notification.bookingId;
            const notificationType = notification.type;

            const isMatch = (notificationType === 'PAYMENT_SUCCESS' || notificationType === 'BOOKING_CONFIRMED')
                && notificationBookingId === heldBookingId;

            if (isMatch) {
                logger.log('[PAYMENT MULTIPLE] Success notification received!');

                if (payosWindow && !payosWindow.closed) {
                    payosWindow.close();
                }

                setPayosWindow(null);
                setPaymentSuccess(true);
                setPollAttempts(0);
                clearBookingSession();
                onPaymentComplete?.();
            }
        };

        socket.on('notification', handleNotification);
        return () => { socket.off('notification', handleNotification); };
    }, [socket, heldBookingId, payosWindow, paymentSuccess, onPaymentComplete]);

    // Poll payment status when PayOS window is open
    useEffect(() => {
        if (!payosWindow || !heldBookingId) return;

        const MAX_POLL_ATTEMPTS = 150;

        const pollInterval = setInterval(async () => {
            if (payosWindow.closed) {
                clearInterval(pollInterval);
                setPayosWindow(null);
                setPollAttempts(0);
                return;
            }

            if (pollAttempts >= MAX_POLL_ATTEMPTS) {
                clearInterval(pollInterval);
                setPayosWindow(null);
                setPollAttempts(0);
                toast.error('Timeout chờ thanh toán. Vui lòng kiểm tra lịch sử booking.');
                return;
            }

            setPollAttempts(prev => prev + 1);

            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}`,
                    { method: 'GET', headers: { 'Content-Type': 'application/json' } }
                );

                if (response.ok) {
                    const rawData = await response.json();
                    const data = rawData.data || rawData;

                    const isPaymentComplete =
                        data.status === 'confirmed' ||
                        data.paymentStatus === 'paid';

                    if (isPaymentComplete) {
                        clearInterval(pollInterval);

                        if (!payosWindow.closed) {
                            payosWindow.close();
                        }

                        setPayosWindow(null);
                        setPaymentSuccess(true);
                        setPollAttempts(0);
                        clearBookingSession();
                        onPaymentComplete?.();
                    }
                }
            } catch (error) {
                logger.error('[PAYMENT MULTIPLE] Error polling status:', error);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [payosWindow, heldBookingId, pollAttempts, onPaymentComplete]);



    // Format date for display
    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
        });
    };

    // =========================================================================
    // RENDER: Error State
    // =========================================================================
    if (holdError) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-red-200 bg-red-50">
                    <CardHeader className="border-b border-red-200">
                        <CardTitle className="text-xl text-red-800 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6" />
                            Không thể thanh toán
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <p className="text-red-700">{holdError}</p>

                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Quay lại
                            </Button>
                            {onRestart && (
                                <Button variant="default" onClick={() => { clearBookingSession(); onRestart(); }}>
                                    Bắt đầu lại
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Payment Success
    // =========================================================================
    if (paymentSuccess) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-green-200 bg-green-50">
                    <CardContent className="p-8 text-center">
                        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-3">
                            Thanh toán thành công!
                        </h2>
                        <p className="text-lg text-gray-600 mb-6">
                            Đã tạo {bookingIds.length || summary?.totalBookings || summary?.totalDates || 0} booking thành công.
                            Chúng tôi đã gửi email xác nhận đến {bookingData?.email}.
                        </p>

                        {summary && (
                            <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-md mx-auto border">
                                <h3 className="font-semibold text-gray-900 mb-4">Tóm tắt đặt sân</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sân:</span>
                                        <span className="font-medium">{currentField?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Số buổi:</span>
                                        <span className="font-medium">{summary.totalBookings || summary.totalDates} buổi</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t">
                                        <span className="font-semibold">Tổng:</span>
                                        <span className="font-semibold text-green-600">
                                            {formatVND(summary.totalAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // =========================================================================
    // RENDER: Payment Form (Main State)
    // =========================================================================
    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 py-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Booking Summary */}
                <div className="md:col-span-7 space-y-6">
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b bg-emerald-50">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-700" />
                                Thông tin đặt sân ({aiBookingType === 'consecutive' ? 'Liên tiếp' : 'Hàng tuần'})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Field Info */}
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Sân:</span>
                                <span className="font-medium">{currentField?.name}</span>
                            </div>

                            {/* Total Bookings */}
                            <div className="flex justify-between py-2 border-b">
                                <span className="text-gray-500">Số buổi đặt:</span>
                                <span className="font-semibold text-emerald-600">
                                    {bookingIds.length || summary?.totalBookings || summary?.totalDates || '...'} buổi
                                </span>
                            </div>

                            {/* Countdown */}
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-800 font-medium">Thời gian giữ chỗ:</span>
                                    <span className={`text-2xl font-bold ${countdown < 60 ? 'text-red-600' : 'text-amber-700'}`}>
                                        {formatCountdown(countdown)}
                                    </span>
                                </div>
                                <p className="text-xs text-amber-700 mt-1">
                                    Vui lòng hoàn tất thanh toán trước khi hết thời gian
                                </p>
                            </div>

                            {/* Date List */}
                            {summary?.dates && summary.dates.length > 0 && (
                                <div className="pt-2">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Các ngày đã đặt:</h4>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                        {summary.dates.map((date: string, idx: number) => (
                                            <span
                                                key={idx}
                                                className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-md"
                                            >
                                                {formatDate(date)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Payment */}
                <div className="md:col-span-5 space-y-6">
                    <Card className="border border-gray-200 sticky top-24">
                        <CardHeader className="border-b bg-blue-50">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-blue-700" />
                                Thanh toán
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Pricing Breakdown */}
                            {summary && (
                                <>
                                    <div className="flex justify-between py-2">
                                        <span className="text-gray-500">Giá mỗi buổi:</span>
                                        <span className="font-medium">
                                            {formatVND(summary.pricePerDay || summary.pricePerBooking || 0)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-3 border-t border-dashed text-lg">
                                        <span className="font-semibold">Tổng cộng:</span>
                                        <span className="font-bold text-emerald-600">
                                            {formatVND(summary.totalAmount || 0)}
                                        </span>
                                    </div>
                                </>
                            )}

                            {/* Payment Button */}
                            <Button
                                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                                onClick={handlePayWithPayOS}
                                disabled={!heldBookingId || payosWindow !== null}
                            >
                                {payosWindow ? (
                                    <>
                                        <Loading size={20} className="mr-2" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Wallet className="w-5 h-5 mr-2" />
                                        Thanh toán với PayOS
                                    </>
                                )}
                            </Button>

                            {/* Back Button */}
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleBackClick}
                                disabled={payosWindow !== null || isCancelling}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Quay lại
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hủy giữ chỗ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn đang có {bookingIds.length || 1} booking được giữ chỗ.
                            Nếu quay lại, tất cả booking sẽ bị hủy và bạn có thể mất các slot này.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Đóng</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleCancelBooking}
                            disabled={isCancelling}
                        >
                            {isCancelling ? 'Đang hủy...' : 'Hủy giữ chỗ & Quay lại'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PaymentMultiple;
