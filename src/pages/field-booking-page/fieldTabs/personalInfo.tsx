import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hook";
import { useLocation } from "react-router-dom";
import type { Field } from "@/types/field-type";
import axiosPrivate from "@/utils/axios/axiosPrivate";
import { Loading } from "@/components/ui/loading";
import logger from "@/utils/logger";

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
 * Props for PersonalInfoTab component
 */
interface PersonalInfoTabProps {
    /**
     * Venue information to display
     */
    venue?: Field;
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
    /**
     * Available courts list
     */
    courts?: Array<{ id: string; name: string; courtNumber?: number }>;
    /**
     * Custom text for submit button (default: "Tiếp tục đến thanh toán")
     */
    submitButtonText?: string;
    /**
     * If true, skip the field-booking-hold API call and just call onSubmit
     * Used when this component is part of a combined booking flow (field + coach)
     */
    skipFieldBookingHold?: boolean;
}

/**
 * PersonalInfoTab component - Collects user personal information for booking
 */
export const PersonalInfoTab: React.FC<PersonalInfoTabProps> = ({
    venue: venueProp,
    bookingData,
    onSubmit,
    onBack,
    submitButtonText = "Tiếp tục đến thanh toán",
    skipFieldBookingHold = false,
}) => {
    const location = useLocation();
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

    // (Removed unused date/time formatting helpers)

    // Form validation
    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Full name is required';
        }

        if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.phone?.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^[\d\s\-+()]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number';
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

        // If skipFieldBookingHold is true (combined booking flow), just call onSubmit without holding slot
        if (skipFieldBookingHold) {
            if (onSubmit) {
                onSubmit(formData);
            }
            return;
        }

        // Call booking hold API before moving to payment
        if (!venue?.id || !formData.date || !formData.startTime || !formData.endTime || !formData.courtId) {
            setHoldError('Thiếu thông tin đặt sân (court, ngày, giờ). Vui lòng quay lại và kiểm tra.');
            return;
        }

        setIsHoldingSlot(true);
        setHoldError(null);

        try {
            // Get selected amenity IDs from sessionStorage
            const selectedAmenityIds: string[] = [];
            try {
                const raw = sessionStorage.getItem('selectedAmenityIds');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        selectedAmenityIds.push(...parsed);
                    }
                }
            } catch {
                // Ignore parsing errors
            }

            // Get note from sessionStorage
            const note = sessionStorage.getItem('amenitiesNote') || undefined;

            const payload: any = {
                fieldId: venue.id,
                courtId: formData.courtId,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
            };

            if (selectedAmenityIds.length > 0) {
                payload.selectedAmenities = selectedAmenityIds;
            }

            if (note) {
                payload.note = note;
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

            const response = await axiosPrivate.post(`/bookings/field-booking-hold`, payload);

            const responseData = response.data;

            // API wraps response in {success: true, data: booking} format
            const booking = responseData.data || responseData;
            const bookingIdStr = booking._id || booking.id;

            // Validate booking ID before storing
            if (!bookingIdStr || typeof bookingIdStr !== 'string' || bookingIdStr.trim() === '') {
                logger.error('[PERSONAL INFO] Invalid booking ID received from server:', { responseData, booking });
                throw new Error('Không nhận được ID booking hợp lệ từ server. Vui lòng thử lại.');
            }

            // Store booking hold in sessionStorage
            sessionStorage.setItem('heldBookingId', bookingIdStr);
            sessionStorage.setItem('heldBookingTime', Date.now().toString());
            sessionStorage.setItem('heldBookingCountdown', '300'); // 5 minutes

            logger.debug('[PERSONAL INFO] Booking hold created:', bookingIdStr);

            // Move to payment step
            if (onSubmit) {
                onSubmit(formData);
            }
        } catch (error: any) {
            logger.error('[PERSONAL INFO] Error creating booking hold:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Không thể giữ chỗ. Vui lòng thử lại.';
            setHoldError(errorMessage);
        } finally {
            setIsHoldingSlot(false);
        }
    };

    if (!venue) {
        return (
            <div className="w-full max-w-[1320px] mx-auto px-3 py-10">
                <Card className="border border-gray-200">
                    <CardContent className="p-6">
                        <p className="text-base text-[#6b7280]">No field selected. Please select a field to book.</p>
                        <div className="pt-4">
                            <Button variant="outline" onClick={onBack}>Back</Button>
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

                {/* User Info Sidebar (removed) */}
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
                            <Loading size={16} className="mr-2 border-white" />
                            Đang xử lý...
                        </>
                    ) : (
                        <>
                            {submitButtonText}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default PersonalInfoTab;
