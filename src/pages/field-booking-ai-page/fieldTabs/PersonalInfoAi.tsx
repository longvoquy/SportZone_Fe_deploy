import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector, useAppDispatch } from "@/store/hook";
import { useLocation } from "react-router-dom";
import type { Field } from "@/types/field-type";
import { Loading } from "@/components/ui/loading";
import logger from "@/utils/logger";
import { createConsecutiveDaysBooking, createWeeklyRecurringBooking } from "@/features/booking/bookingThunk";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

/**
 * Interface for booking form data
 */
export interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    courtId?: string;
    courtName?: string;
    name?: string;
    email?: string;
    phone?: string;
}

/**
 * Props for PersonalInfoAi component
 */
interface PersonalInfoAiProps {
    /**
     * Venue information to display
     */
    venue?: Field;
    /**
     * Booking form data from previous step
     */
    bookingData?: BookingFormData;
    /**
     * Callback when form is submitted successfully
     */
    onSubmit?: (formData: BookingFormData) => void;
    /**
     * Callback for back button
     */
    onBack?: () => void;
    /**
     * Available courts list
     */
    courts?: Array<{ _id: string; name: string; courtNumber?: number }>;
    /**
     * Custom text for submit button
     */
    submitButtonText?: string;
    /**
     * AI Booking payload (for consecutive or weekly booking)
     */
    aiBookingPayload: any;
    /**
     * AI Booking type: 'consecutive' or 'weekly'
     */
    aiBookingType: 'consecutive' | 'weekly';
}

/**
 * PersonalInfoAi component - Collects user personal information for AI/Multiple booking
 * Creates bookings when user submits (instead of just holding slot)
 */
export const PersonalInfoAi: React.FC<PersonalInfoAiProps> = ({
    venue: venueProp,
    bookingData,
    onSubmit,
    onBack,
    submitButtonText = "Tạo booking và thanh toán",
    aiBookingPayload,
    aiBookingType,
}) => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField);
    const venue = (venueProp || currentField || (location.state as any)?.venue) as Field | undefined;

    // Get user info from auth state
    const auth = useAppSelector((state) => state.auth);
    const currentUser = auth.user;

    // Form state with user info pre-filled
    const [formData, setFormData] = useState<BookingFormData>({
        date: bookingData?.date || '',
        startTime: bookingData?.startTime || '',
        endTime: bookingData?.endTime || '',
        courtId: bookingData?.courtId || '',
        courtName: bookingData?.courtName || '',
        name: bookingData?.name || currentUser?.fullName || '',
        email: bookingData?.email || currentUser?.email || '',
        phone: bookingData?.phone || currentUser?.phone || '',
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Update form when user info changes
    useEffect(() => {
        if (currentUser && !bookingData?.name) {
            setFormData(prev => ({
                ...prev,
                name: currentUser.fullName || '',
                email: currentUser.email || '',
                phone: currentUser.phone || '',
            }));
        }
    }, [currentUser, bookingData]);

    // Form validation
    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Họ và tên là bắt buộc';
        }

        if (!formData.email?.trim()) {
            newErrors.email = 'Email là bắt buộc';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Vui lòng nhập email hợp lệ';
        }

        if (!formData.phone?.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc';
        } else if (!/^[\d\s\-+()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Vui lòng nhập số điện thoại hợp lệ';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof BookingFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const [isCreatingBooking, setIsCreatingBooking] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<Array<{ date: string; reason: string }>>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleSubmitClick = () => {
        if (!validateForm()) {
            return;
        }

        if (!aiBookingPayload || !aiBookingType) {
            setCreateError('Thiếu thông tin đặt sân. Vui lòng quay lại và thử lại.');
            return;
        }

        // Show confirmation modal
        logger.debug('[PERSONAL INFO AI] Showing confirmation modal');
        setShowConfirmModal(true);
    };

    const handleConfirmBooking = async () => {
        setShowConfirmModal(false);
        setIsCreatingBooking(true);
        setCreateError(null);
        setConflicts([]);

        try {
            // Add guest info to payload if not logged in
            const finalPayload = { ...aiBookingPayload };
            if (!currentUser) {
                if (formData.email) {
                    finalPayload.guestEmail = formData.email;
                }
                if (formData.phone) {
                    finalPayload.guestPhone = formData.phone;
                }
                if (formData.name) {
                    finalPayload.guestName = formData.name;
                }
            }

            logger.debug('[PERSONAL INFO AI] Creating bookings:', { type: aiBookingType, payload: finalPayload });

            let result;
            if (aiBookingType === 'consecutive') {
                result = await dispatch(createConsecutiveDaysBooking(finalPayload)).unwrap();
            } else if (aiBookingType === 'weekly') {
                result = await dispatch(createWeeklyRecurringBooking(finalPayload)).unwrap();
            } else {
                throw new Error('Loại đặt sân không hợp lệ');
            }

            logger.log('[PERSONAL INFO AI] Bookings created successfully:', result);
            logger.debug('[PERSONAL INFO AI] Raw result structure:', JSON.stringify(result, null, 2));

            // Handle multiple possible response structures
            const bookingsData = result.data?.bookings || result.bookings || [];
            const bookings = Array.isArray(bookingsData) ? bookingsData : [];
            const primaryBooking = bookings[0];

            // Use only _id as it is consistent with our Booking interface and Mongoose
            const bookingIdStr = primaryBooking?._id?.toString?.() || primaryBooking?._id;

            if (!bookingIdStr) {
                logger.error('[PERSONAL INFO AI] No booking _id found. Primary booking:', primaryBooking);
                logger.error('[PERSONAL INFO AI] Full result:', result);
                throw new Error('Khong nhan duoc ID booking tu server');
            }

            // Store booking info in sessionStorage for PaymentMultiple
            sessionStorage.setItem('heldBookingId', bookingIdStr);
            sessionStorage.setItem('heldBookingTime', Date.now().toString());
            sessionStorage.setItem('heldBookingCountdown', '300'); // 5 minutes
            sessionStorage.setItem('aiBookingIds', JSON.stringify(bookings.map((b: any) => b._id)));
            sessionStorage.setItem('aiBookingSummary', JSON.stringify(result.summary || result.data?.summary || {}));

            logger.debug('[PERSONAL INFO AI] Booking created, primary ID:', bookingIdStr);

            // Move to payment step
            if (onSubmit) {
                onSubmit(formData);
            }
        } catch (error: any) {
            logger.error('[PERSONAL INFO AI] Error creating bookings:', error);

            // Handle conflict errors
            if (error.conflicts && Array.isArray(error.conflicts)) {
                setConflicts(error.conflicts);
                setCreateError('Một số ngày đã bị đặt. Vui lòng quay lại và chọn ngày khác.');
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo booking. Vui lòng thử lại.';
                setCreateError(errorMessage);
            }
        } finally {
            setIsCreatingBooking(false);
        }
    };

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

    if (!venue) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">Không tìm thấy sân. Vui lòng chọn sân trước.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>Quay lai</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-10">
            {/* Personal Information Form */}
            <div className="flex flex-wrap gap-6 mt-6">
                {/* Form Section */}
                <div className="flex-1 min-w-[600px]">
                    <Card className="border border-gray-200">
                        <CardHeader className="border-b border-gray-200">
                            <CardTitle className="text-2xl font-semibold">
                                Thông tin liên hệ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Full Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-base font-medium">
                                    Họ và tên *
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={`h-14 bg-gray-50 border-0 ${errors.name ? 'border-red-500 border' : ''}`}
                                    placeholder="Nhập họ và tên của bạn"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-base font-medium">
                                    Email *
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className={`h-14 bg-gray-50 border-0 ${errors.email ? 'border-red-500 border' : ''}`}
                                    placeholder="Nhập email của bạn"
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-base font-medium">
                                    Số điện thoại *
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className={`h-14 bg-gray-50 border-0 ${errors.phone ? 'border-red-500 border' : ''}`}
                                    placeholder="Nhập số điện thoại của bạn"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                                )}
                            </div>


                            {/* Error Display */}
                            {createError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-red-800 font-medium">{createError}</p>
                                            {conflicts.length > 0 && (
                                                <ul className="mt-2 space-y-1">
                                                    {conflicts.map((c, idx) => (
                                                        <li key={idx} className="text-xs text-red-700">
                                                            {formatDate(c.date)}: {c.reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center gap-5 py-5 bg-white/20 shadow-[0px_4px_44px_0px_rgba(211,211,211,0.25)]">
                <Button
                    variant="outline"
                    onClick={onBack}
                    className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-700"
                    disabled={isCreatingBooking}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lai
                </Button>
                <Button
                    onClick={handleSubmitClick}
                    className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white"
                    disabled={!formData.name || !formData.email || !formData.phone || isCreatingBooking}
                >
                    {isCreatingBooking ? (
                        <>
                            <Loading size={16} className="mr-2 border-white" />
                            Đang tạo booking...
                        </>
                    ) : (
                        <>
                            {submitButtonText}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <Dialog open={showConfirmModal} onOpenChange={(open) => {
                    logger.debug('[PERSONAL INFO AI] Dialog onOpenChange:', open);
                    setShowConfirmModal(open);
                }}>
                    <DialogContent className="sm:max-w-[500px] z-[100]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-gray-900">
                                <AlertCircle className="h-5 w-5 text-emerald-600" />
                                Xác nhận tạo booking
                            </DialogTitle>
                            <DialogDescription className="text-gray-600 mt-2">
                                Bạn có chắc chắn muốn tạo booking này? Booking sẽ được tạo và bạn sẽ được chuyển đến trang thanh toán.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2 text-sm text-gray-700">
                            <div className="flex justify-between">
                                <span className="font-medium">Loại booking:</span>
                                <span>{aiBookingType === 'consecutive' ? 'Đặt nhiều ngày' : 'Đặt cố định hàng tuần'}</span>
                            </div>
                            {aiBookingPayload?.startDate && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Ngày bắt đầu:</span>
                                    <span>{new Date(aiBookingPayload.startDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                            )}
                            {aiBookingPayload?.endDate && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Ngày kết thúc:</span>
                                    <span>{new Date(aiBookingPayload.endDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                            )}
                            {aiBookingPayload?.startTime && aiBookingPayload?.endTime && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Thời gian mặc định:</span>
                                    <span>{aiBookingPayload.startTime} - {aiBookingPayload.endTime}</span>
                                </div>
                            )}
                            {aiBookingType === 'weekly' && aiBookingPayload?.weekdays && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Thứ trong tuần:</span>
                                    <span>{aiBookingPayload.weekdays.join(', ')}</span>
                                </div>
                            )}
                            {aiBookingType === 'weekly' && aiBookingPayload?.numberOfWeeks && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Số tuần:</span>
                                    <span>{aiBookingPayload.numberOfWeeks}</span>
                                </div>
                            )}

                            {/* Display skipped dates */}
                            {aiBookingPayload?.skipDates && aiBookingPayload.skipDates.length > 0 && (
                                <div className="pt-2 border-t">
                                    <span className="font-medium text-orange-600">Ngày bỏ qua ({aiBookingPayload.skipDates.length}):</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {aiBookingPayload.skipDates.map((date: string, idx: number) => (
                                            <span key={idx} className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                                {new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Display rescheduled dates */}
                            {aiBookingPayload?.dateOverrides && Object.keys(aiBookingPayload.dateOverrides).length > 0 && (
                                <div className="pt-2 border-t">
                                    <span className="font-medium text-blue-600">Ngày đã đổi giờ:</span>
                                    <div className="mt-1 space-y-1">
                                        {Object.entries(aiBookingPayload.dateOverrides).map(([date, override]: [string, any], idx: number) => (
                                            <div key={idx} className="flex justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                                                <span>{new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}:</span>
                                                <span className="text-blue-700 font-medium">
                                                    {override.startTime && override.endTime
                                                        ? `${override.startTime} - ${override.endTime}`
                                                        : 'Đổi sân'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isCreatingBooking}
                                className="flex-1"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleConfirmBooking}
                                disabled={isCreatingBooking}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isCreatingBooking ? (
                                    <>
                                        <Loading size={16} className="mr-2 border-white" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    'Xác nhận'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default PersonalInfoAi;
