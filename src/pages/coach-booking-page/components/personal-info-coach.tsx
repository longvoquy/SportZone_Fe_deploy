import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hook";
import axiosPrivate from "@/utils/axios/axiosPrivate";
import logger from "@/utils/logger";

/**
 * Interface for booking form data
 */
interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    fieldId?: string;
    note?: string;
    name?: string;
    email?: string;
    phone?: string;
}

/**
 * Props for PersonalInfoCoach component
 */
interface PersonalInfoCoachProps {
    /**
     * Coach ID
     */
    coachId: string;
    /**
     * Booking form data from previous step
     */
    bookingData?: BookingFormData;
    /**
     * Callback when form is submitted
     */
    onSubmit?: (formData: BookingFormData) => void;
    /**
     * Callback for back button
     */
    onBack?: () => void;
}

/**
 * PersonalInfoCoach component - Collects user personal information for coach booking
 */
export const PersonalInfoCoach: React.FC<PersonalInfoCoachProps> = ({
    coachId,
    bookingData,
    onSubmit,
    onBack,
}) => {
    // Get user info from auth state
    const auth = useAppSelector((state) => state.auth);
    const currentUser = auth.user;

    // Form state with user info pre-filled
    const [formData, setFormData] = useState<BookingFormData>({
        date: bookingData?.date || '',
        startTime: bookingData?.startTime || '',
        endTime: bookingData?.endTime || '',
        fieldId: bookingData?.fieldId || '',
        note: bookingData?.note || '',
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

    const [isHoldingSlot, setIsHoldingSlot] = useState(false);
    const [holdError, setHoldError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Call booking hold API before moving to payment
        if (!coachId || !formData.date || !formData.startTime || !formData.endTime) {
            setHoldError('Thiếu thông tin đặt lịch. Vui lòng quay lại và kiểm tra.');
            return;
        }


        setIsHoldingSlot(true);
        setHoldError(null);

        try {
            const payload: any = {
                coachId: coachId,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
            };

            // Only include fieldId if provided (optional for coach bookings)
            if (formData.fieldId) {
                payload.fieldId = formData.fieldId;
            }

            if (formData.note) {
                payload.note = formData.note;
            }

            // Add guest info if not logged in
            if (!currentUser) {
                if (formData.email) {
                    payload.guestEmail = formData.email;
                }
                if (formData.phone) {
                    payload.guestPhone = formData.phone;
                }
                if (formData.name) {
                    payload.guestName = formData.name;
                }
            }

            const response = await axiosPrivate.post(`/bookings/coach-booking-hold`, payload);

            const responseData = response.data;

            // API wraps response in {success: true, data: booking} format
            const booking = responseData.data || responseData;
            const bookingIdStr = booking._id || booking.id;

            // Validate booking ID before storing
            if (!bookingIdStr || typeof bookingIdStr !== 'string' || bookingIdStr.trim() === '') {
                logger.error('[PERSONAL INFO COACH] Invalid booking ID received from server:', { responseData, booking });
                throw new Error('Không nhận được ID booking hợp lệ từ server. Vui lòng thử lại.');
            }

            // Store booking hold in localStorage
            localStorage.setItem('heldBookingId', bookingIdStr);
            localStorage.setItem('heldBookingTime', Date.now().toString());
            localStorage.setItem('heldBookingCountdown', '300'); // 5 minutes

            logger.debug('[PERSONAL INFO COACH] Booking hold created:', bookingIdStr);

            // Move to payment step
            if (onSubmit) {
                onSubmit(formData);
            }
        } catch (error: any) {
            logger.error('[PERSONAL INFO COACH] Error creating booking hold:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể giữ chỗ. Vui lòng thử lại.';
            setHoldError(errorMessage);
        }
        finally {
            setIsHoldingSlot(false);
        }
    };

    if (!coachId) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">Thiếu thông tin coach. Vui lòng quay lại và chọn lại.</p>
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


                            {/* Hold Error Display */}
                            {holdError && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                    <p className="text-sm">{holdError}</p>
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
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại
                </Button>
                <Button
                    onClick={handleSubmit}
                    className="px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white"
                    disabled={!formData.name || !formData.email || !formData.phone || isHoldingSlot}
                >
                    {isHoldingSlot ? (
                        <>
                            <Loading size={16} className="mr-2" />
                            Đang giữ chỗ...
                        </>
                    ) : (
                        <>
                            Tiếp tục đến thanh toán
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PersonalInfoCoach;

