import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Wallet, Clock } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { useLocation } from "react-router-dom";
import type { Field } from "@/types/field-type";
import { clearError } from "@/features/booking/bookingSlice";
import type { BookingFormData } from "./personalInfo";
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
import { toast } from "sonner";
import logger from "@/utils/logger";
// Helper function for formatting VND
const formatVND = (value: number): string => {
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    } catch {
        return `${value.toLocaleString('vi-VN')} â‚«`;
    }
};

/**
 * Props for PaymentV2 component
 */
interface PaymentV2Props {
    venue?: Field;
    bookingData?: BookingFormData;
    onPaymentComplete?: (bookingData: BookingFormData) => void;
    onBack?: () => void;
    onCountdownExpired?: () => void; // Callback khi countdown háº¿t
    amenities?: Array<{ id: string; name: string; price: number }>;
    selectedAmenityIds?: string[];
}

/**
 * PaymentV2 component - Bank transfer with proof image upload
 */
export const PaymentV2: React.FC<PaymentV2Props> = ({
    venue: venueProp,
    bookingData,
    onBack,
    onCountdownExpired,
    amenities = [],
    selectedAmenityIds = [],
}) => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField);
    const venue = (venueProp || currentField || (location.state as any)?.venue) as Field | undefined;

    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [heldBookingId, setHeldBookingId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(300); // 5 minutes in seconds
    const [holdError, setHoldError] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Use booking data from props or fallback to sessionStorage
    const formData: BookingFormData = useMemo(() => {
        if (bookingData) {
            return {
                date: bookingData.date || '',
                startTime: bookingData.startTime || '',
                endTime: bookingData.endTime || '',
                courtId: bookingData.courtId || '',
                courtName: bookingData.courtName || '',
                name: bookingData.name || '',
                email: bookingData.email || '',
                phone: bookingData.phone || '',
                note: (bookingData as any).note || '',
            };
        }
        try {
            const raw = sessionStorage.getItem('bookingFormData');
            if (!raw) return { date: '', startTime: '', endTime: '' } as BookingFormData;
            const parsed = JSON.parse(raw);
            return {
                date: parsed?.date || '',
                startTime: parsed?.startTime || '',
                endTime: parsed?.endTime || '',
                courtId: parsed?.courtId || '',
                courtName: parsed?.courtName || '',
                name: parsed?.name || '',
                email: parsed?.email || '',
                phone: parsed?.phone || '',
                note: parsed?.note || '',
            } as BookingFormData;
        } catch {
            return { date: '', startTime: '', endTime: '' } as BookingFormData;
        }
    }, [bookingData]);

    // Calculate helper functions first
    const calculateDuration = useCallback((): number => {
        if (!formData.startTime || !formData.endTime) return 0;

        const start = new Date(`1970-01-01T${formData.startTime}:00`);
        const end = new Date(`1970-01-01T${formData.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        return hours > 0 ? hours : 0;
    }, [formData.startTime, formData.endTime]);

    const calculateAmenitiesTotal = useCallback((): number => {
        if (!amenities || !selectedAmenityIds?.length) return 0;
        try {
            return amenities
                .filter((a) => selectedAmenityIds.includes(a.id))
                .reduce((sum, a) => sum + (Number(a.price) || 0), 0);
        } catch { return 0; }
    }, [amenities, selectedAmenityIds]);

    const calculateSystemFee = useCallback((): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0;

        const start = new Date(`1970-01-01T${formData.startTime}:00`);
        const end = new Date(`1970-01-01T${formData.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        const base = venue.basePrice * hours;
        const extras = calculateAmenitiesTotal();
        const baseAmount = base + extras;
        const systemFeeRate = 0.05; // 5% system fee
        const systemFee = Math.round(baseAmount * systemFeeRate);
        return systemFee > 0 ? systemFee : 0;
    }, [venue, formData.startTime, formData.endTime, calculateAmenitiesTotal]);

    const calculateTotal = useCallback((): number => {
        if (!venue || !formData.startTime || !formData.endTime) return 0;

        const start = new Date(`1970-01-01T${formData.startTime}:00`);
        const end = new Date(`1970-01-01T${formData.endTime}:00`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

        const base = venue.basePrice * hours;
        const extras = calculateAmenitiesTotal();
        const baseAmount = base + extras;
        const systemFee = calculateSystemFee();
        const total = baseAmount + systemFee;
        return total > 0 ? total : 0;
    }, [venue, formData.startTime, formData.endTime, calculateAmenitiesTotal, calculateSystemFee]);

    const isBookingDataValid = useMemo(() => {
        return Boolean(
            venue &&
            formData.date &&
            formData.startTime &&
            formData.endTime &&
            calculateDuration() > 0 &&
            calculateTotal() > 0
        );
    }, [venue, formData.date, formData.startTime, formData.endTime, calculateDuration, calculateTotal]);

    // Note: Bank account info is not needed for PayOS payment flow
    // PayOS handles payment through their checkout URL

    // Restore held booking from sessionStorage on mount (created in PersonalInfo step)
    useEffect(() => {
        try {
            const storedBookingId = sessionStorage.getItem('heldBookingId');
            const storedHoldTime = sessionStorage.getItem('heldBookingTime');

            logger.debug('[PAYMENT V2] Checking sessionStorage for held booking:', {
                storedBookingId,
                storedHoldTime
            });

            // Validate stored booking ID
            if (!storedBookingId || storedBookingId.trim() === '' || storedBookingId === 'undefined' || storedBookingId === 'null') {
                logger.warn('[PAYMENT V2] Invalid or missing heldBookingId in sessionStorage:', storedBookingId);
                setHoldError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
                return;
            }

            if (storedHoldTime) {
                const holdTime = parseInt(storedHoldTime);
                if (isNaN(holdTime)) {
                    logger.error('[PAYMENT V2] Invalid hold time:', storedHoldTime);
                    setHoldError('Dữ liệu booking không hợp lệ. Vui lòng quay lại bước trước.');
                    return;
                }

                const now = Date.now();
                const elapsed = Math.floor((now - holdTime) / 1000);
                const remaining = 300 - elapsed; // 5 minutes = 300 seconds

                if (remaining > 0) {
                    setHeldBookingId(storedBookingId);
                    setCountdown(remaining);
                    logger.debug('[PAYMENT V2] Restored held booking:', {
                        bookingId: storedBookingId,
                        remainingSeconds: remaining
                    });
                } else {
                    // Booking expired, clear sessionStorage
                    logger.warn('[PAYMENT V2] Held booking expired');
                    sessionStorage.removeItem('heldBookingId');
                    sessionStorage.removeItem('heldBookingCountdown');
                    sessionStorage.removeItem('heldBookingTime');
                    setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');
                }
            } else {
                logger.warn('[PAYMENT V2] No hold time found in sessionStorage');
                setHoldError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
            }
        } catch (error) {
            logger.error('[PAYMENT V2] Error restoring held booking:', error);
            setHoldError('Lỗi khi khôi phục thông tin booking. Vui lòng quay lại bước trước.');
        }
    }, []);

    // Booking hold is now created in PersonalInfo step, so we skip this useEffect
    // PaymentV2 only reads the existing hold from sessionStorage (see useEffect above)

    // Handle cancel booking hold
    const handleCancelBooking = useCallback(async () => {
        if (!heldBookingId) {
            // No booking to cancel, just go back
            onBack?.();
            return;
        }

        setIsCancelling(true);
        try {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/cancel-hold`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    cancellationReason: 'Người dùng hủy đặt sân'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PaymentV2] Error cancelling booking:', errorData);
                toast.error('Không thể hủy đặt sân. Vui lòng thử lại.');
            } else {
                logger.debug('[PaymentV2] Booking hold cancelled successfully');
                toast.success('Đã hủy đặt sân thành công');
            }
        } catch (error) {
            logger.error('[PaymentV2] Error cancelling booking:', error);
            toast.error('Có lỗi xảy ra khi hủy đặt sân');
        } finally {
            setIsCancelling(false);
            // Clear all sessionStorage
            clearBookingLocal();
            sessionStorage.removeItem('heldBookingId');
            sessionStorage.removeItem('heldBookingCountdown');
            sessionStorage.removeItem('heldBookingTime');

            // Reset state
            setHeldBookingId(null);
            setCountdown(0);
            setShowCancelDialog(false);

            // Go back to previous step
            onBack?.();
        }
    }, [heldBookingId, onBack]);

    // Handle back button click - show confirmation dialog
    const handleBackClick = useCallback(() => {
        if (heldBookingId) {
            // Show confirmation dialog if there's a held booking
            setShowCancelDialog(true);
        } else {
            // No booking to cancel, just go back
            onBack?.();
        }
    }, [heldBookingId, onBack]);

    // Handle countdown expired - release slot and reset to step 1
    const handleCountdownExpired = useCallback(async () => {
        if (!heldBookingId) return;

        try {
            // Call public API to cancel booking hold (no auth required)
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/cancel-hold`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    cancellationReason: 'Thời gian giữ chỗ đã hết (5 phút)'
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
                logger.error('[PaymentV2] Error cancelling booking on countdown expiry:', errorData);
            } else {
                logger.debug('[PaymentV2] Booking hold cancelled successfully');
            }
        } catch (error) {
            // Log error but continue with cleanup
            logger.error('[PaymentV2] Error cancelling booking on countdown expiry:', error);
        }

        // Clear all sessionStorage (always run, even if API call fails)
        clearBookingLocal();
        sessionStorage.removeItem('heldBookingId');
        sessionStorage.removeItem('heldBookingCountdown');
        sessionStorage.removeItem('heldBookingTime');

        // Reset state
        setHeldBookingId(null);
        setCountdown(0);
        setHoldError('Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.');

        // Callback to parent to reset to step 1
        onCountdownExpired?.();
    }, [heldBookingId, onCountdownExpired]);

    // Countdown timer effect
    useEffect(() => {
        if (!heldBookingId || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                const newCountdown = prev - 1;
                if (newCountdown <= 0) {
                    clearInterval(timer);
                    // Booking expired - release slot and reset
                    handleCountdownExpired();
                    return 0;
                }
                // Update sessionStorage
                sessionStorage.setItem('heldBookingCountdown', newCountdown.toString());
                return newCountdown;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [heldBookingId, countdown, handleCountdownExpired]);

    // Handle PayOS payment initiation
    const handlePayWithPayOS = async () => {
        if (!heldBookingId) {
            setPaymentError('Chưa có booking được giữ chỗ. Vui lòng quay lại bước trước.');
            return;
        }

        setPaymentStatus('processing');
        dispatch(clearError());

        try {
            const token = sessionStorage.getItem('token');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(`${import.meta.env.VITE_API_URL}/bookings/${heldBookingId}/payment/payos`, {
                method: 'POST',
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể tạo link thanh toán');
            }

            const data = await response.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error('Link thanh toán không tồn tại');
            }

        } catch (error: any) {
            logger.error('PayOS Error:', error);
            setPaymentError(error.message || 'Lỗi khi khởi tạo thanh toán PayOS');
            setPaymentStatus('error');
        }
    };

    // Helper functions
    const formatDate = (dateString: string): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeString: string): string => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    // Retry booking hold (if needed)
    const handleRetryHold = () => {
        setHoldError(null);
        setHeldBookingId(null);
    };

    // Clear persisted booking-related local storage
    const clearBookingLocal = () => {
        try {
            sessionStorage.removeItem('bookingFormData');
            sessionStorage.removeItem('selectedFieldId');
            sessionStorage.removeItem('amenitiesNote');
            sessionStorage.removeItem('heldBookingId');
            sessionStorage.removeItem('heldBookingCountdown');
            sessionStorage.removeItem('heldBookingTime');
        } catch (error) {
            logger.error('Error clearing booking local storage:', error);
        }
    };

    // Format countdown timer (MM:SS)
    const formatCountdown = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!venue) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">Chưa chọn sân. Vui lòng chọn sân để đặt.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>Quay lại</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-10">
            {/* Header Card */}
            <Card className="border border-gray-200">
                <CardContent className="">
                    <div className="">
                        <h1 className="text-2xl font-semibold text-center text-[#1a1a1a] mb-1">
                            Xác nhận & Thanh toán
                        </h1>
                        <p className="text-base font-normal text-center text-[#6b7280]">
                            Kiểm tra thông tin và thanh toán qua PayOS để hoàn tất đặt sân.
                        </p>
                    </div>
                    {!isBookingDataValid && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 mt-4">
                            Thiếu hoặc dữ liệu đặt sân không hợp lệ. Vui lòng quay lại và hoàn thành thông tin.
                        </div>
                    )}
                    {heldBookingId && countdown > 0 && (
                        <div className={`p-4 border rounded-lg mt-4 flex items-center justify-between ${countdown < 120
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-green-50 border-green-200 text-green-800'
                            }`}>
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <span>Chỗ đã được giữ. Vui lòng thanh toán trong thời gian còn lại.</span>
                            </div>
                            <div className={`font-bold text-lg ${countdown < 120 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                {formatCountdown(countdown)}
                            </div>
                        </div>
                    )}
                    {holdError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                <span>{holdError}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleRetryHold}>
                                Thử lại
                            </Button>
                        </div>
                    )}
                    {countdown <= 0 && heldBookingId && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 mt-4">
                            <AlertCircle className="w-5 h-5 inline mr-2" />
                            Thời gian giữ chỗ đã hết. Vui lòng quay lại và đặt lại.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Content */}
            <div className="flex flex-wrap gap-6">
                {/* Payment Detail Section */}
                <div className="flex-1 min-w-[350px]">
                    <Card className="border border-gray-200 h-full">
                        <CardHeader className="border-b border-gray-200 pb-4">
                            <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-emerald-600" />
                                Phương thức thanh toán
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="font-bold text-lg text-emerald-800">PayOS</div>
                                </div>
                                <p className="text-sm text-emerald-700">
                                    Thanh toán an toàn, nhanh chóng qua QR Code ứng dụng ngân hàng.
                                </p>
                            </div>

                            {paymentError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                    {paymentError}
                                </div>
                            )}

                            <div className="space-y-3 pt-4">
                                <Button
                                    className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 font-semibold"
                                    onClick={handlePayWithPayOS}
                                    disabled={paymentStatus === 'processing' || !heldBookingId || countdown <= 0}
                                >
                                    {paymentStatus === 'processing' ? (
                                        <>
                                            <Loading className="mr-2 h-5 w-5 text-white" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>Thanh toán {formatVND(calculateTotal())}</>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full h-12 text-gray-600 border-gray-300 hover:bg-gray-50"
                                    onClick={handleBackClick}
                                    disabled={paymentStatus === 'processing'}
                                >
                                    Quay lại
                                </Button>

                                <p className="text-xs text-center text-gray-400 mt-4">
                                    Bằng việc thanh toán, bạn đồng ý với điều khoản đặt sân.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Booking Summary Sidebar */}
                <div className="w-full lg:w-[400px]">
                    <Card className="border border-gray-200 sticky top-4">
                        <CardHeader className="bg-gray-50 border-b border-gray-200 pb-4">
                            <CardTitle className="text-lg font-semibold text-gray-800">
                                Thông tin đặt sân
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <h3 className="font-medium text-gray-900">{venue.name}</h3>
                                <p className="text-sm text-gray-500">{venue.location}</p>
                            </div>
                            <div className="space-y-3 pt-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Sân bóng</span>
                                    <span className="font-medium">{formData.courtName || "Sân thường"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Ngày</span>
                                    <span className="font-medium">{formatDate(formData.date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Giờ</span>
                                    <span className="font-medium">{formatTime(formData.startTime)} - {formatTime(formData.endTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Thời lượng</span>
                                    <span className="font-medium">{calculateDuration()} giờ</span>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Price Breakdown */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Giá sân</span>
                                    <span>{formatVND(calculateTotal() - calculateSystemFee() - calculateAmenitiesTotal())}</span>
                                </div>
                                {calculateAmenitiesTotal() > 0 && (
                                    <div className="flex justify-between text-blue-600">
                                        <span>Tiện ích thêm</span>
                                        <span>+{formatVND(calculateAmenitiesTotal())}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-500">
                                    <span>Phí dịch vụ (5%)</span>
                                    <span>{formatVND(calculateSystemFee())}</span>
                                </div>
                            </div>

                            <hr className="border-dashed border-gray-300" />

                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-900">Tổng cộng</span>
                                <span className="text-xl font-bold text-emerald-600">{formatVND(calculateTotal())}</span>
                            </div>
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
                            Bạn đang có booking được giữ chỗ. Nếu quay lại, booking sẽ bị hủy và bạn có thể mất slot này.
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
