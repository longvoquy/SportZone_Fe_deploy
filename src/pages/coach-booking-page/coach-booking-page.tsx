"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { NavbarDarkComponent } from "../../components/header/navbar-dark-component";
import PageHeader from "../../components/header-banner/page-header";
import { PageWrapper } from "../../components/layouts/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { DatePicker } from "@/components/ui/date-picker";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { getCoachById } from "../../features/coach/coachThunk";
import { PaymentV2Coach } from "./components/payment-v2-coach";
import { PersonalInfoCoach } from "./components/personal-info-coach";
import logger from "@/utils/logger";

interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    fieldId?: string;
    note?: string;
}

const CoachBookingPage = () => {
    const params = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { currentCoach, detailLoading } = useAppSelector((state) => state.coach);

    const coachId = params.id || (location.state as any)?.coachId;
    const initialData = (location.state as any) || {};

    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [bookingData, setBookingData] = useState<BookingFormData>({
        date: initialData.date || '',
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        fieldId: initialData.fieldId || '',
        note: '',
    });
    const [loadingSlots, setLoadingSlots] = useState(false);
    // State for time selection (slot-based, similar to field booking)
    const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);
    // Availability data structure
    const [availabilityData, setAvailabilityData] = useState<{ slots: Array<{ startTime: string; available: boolean }> } | null>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    const breadcrumbs = [
        { label: "Trang chủ", href: "/" },
        { label: "Đặt huấn luyện viên", href: "/coach" },
        { label: "Đặt lịch" }
    ];

    // Fetch coach data
    useEffect(() => {
        if (coachId) {
            dispatch(getCoachById(coachId));
        }
    }, [dispatch, coachId]);

    const fetchAvailableSlots = useCallback(async (date: string) => {
        if (!coachId) return;
        setLoadingSlots(true);
        setAvailabilityError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const response = await fetch(`${apiUrl}/coaches/${coachId}/slots?date=${date}`);
            const data = await response.json();
            let slots: any[] = [];
            if (data && Array.isArray(data)) {
                slots = data;
            } else if (data.data && Array.isArray(data.data)) {
                slots = data.data;
            }

            // Convert to availability data format (coach typically works 8-21)
            // Coach slots are 1 hour each
            const allHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 to 21
            const availabilitySlots = allHours.map(hour => {
                const timeString = `${String(hour).padStart(2, '0')}:00`;
                // Check if this time slot is available from API
                const apiSlot = slots.find((s: any) => s.startTime === timeString);
                return {
                    startTime: timeString,
                    available: apiSlot ? apiSlot.available : true // Default to available if not found
                };
            });

            setAvailabilityData({ slots: availabilitySlots });
        } catch (error) {
            logger.error('Failed to fetch available slots', error);
            setAvailabilityError('Không thể tải thông tin khả dụng');
            setAvailabilityData(null);
        } finally {
            setLoadingSlots(false);
        }
    }, [coachId]);

    // Helper functions for slot manipulation
    const toMinutes = (timeString: string): number => {
        const [hh = '00', mm = '00'] = (timeString || '00:00').split(':');
        return Number(hh) * 60 + Number(mm);
    };

    const minutesToTimeString = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const getSlotEndTime = (startTime: string, slotDuration: number = 60): string => {
        const startTotal = toMinutes(startTime);
        const endTotal = startTotal + slotDuration;
        return minutesToTimeString(endTotal);
    };

    // Check if slot is available
    const isSlotAvailable = (timeString: string): boolean => {
        if (!availabilityData || !availabilityData.slots) {
            return true; // If no data, assume available
        }
        const slot = availabilityData.slots.find(s => s.startTime === timeString);
        return slot ? slot.available : true;
    };

    // Check if slot is in the past (for today's date)
    const isSlotInPast = (slotTime: string, selectedDate: string): boolean => {
        if (!selectedDate) return false;

        const today = new Date();
        const selected = new Date(selectedDate + 'T00:00:00');

        // Compare dates only
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const selectedDateOnly = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

        // If not today, don't disable
        if (selectedDateOnly.getTime() !== todayDateOnly.getTime()) {
            return false;
        }

        // If today, check if slot has passed
        const [slotHour, slotMinute] = slotTime.split(':').map(Number);
        const slotTotal = slotHour * 60 + slotMinute;
        const nowTotal = today.getHours() * 60 + today.getMinutes();

        return slotTotal < nowTotal;
    };

    // Handle slot block click (range selection)
    const handleSlotBlockClick = (slotTime: string) => {
        // Check if slot is in the past
        if (isSlotInPast(slotTime, bookingData.date)) {
            alert('Không thể chọn khung giờ đã qua. Vui lòng chọn khung giờ khác.');
            return;
        }

        const slotDuration = 60; // Coach slots are 1 hour
        const slotEndTime = getSlotEndTime(slotTime, slotDuration);

        if (selectedStartTime === null) {
            // First selection: set both start and end of this block
            setSelectedStartTime(slotTime);
            setSelectedEndTime(slotEndTime);
            setBookingData(prev => ({
                ...prev,
                startTime: slotTime,
                endTime: slotEndTime,
            }));
        } else {
            // Already have selection: extend range
            const currentStartTotal = toMinutes(selectedStartTime);
            const currentEndTotal = toMinutes(selectedEndTime || getSlotEndTime(selectedStartTime, slotDuration));
            const clickedTotal = toMinutes(slotTime);

            let newStartTime: string;
            let newEndTime: string;

            if (clickedTotal < currentStartTotal) {
                // Click before start -> extend backward
                newStartTime = slotTime;
                newEndTime = selectedEndTime || getSlotEndTime(selectedStartTime, slotDuration);
            } else if (clickedTotal >= currentEndTotal) {
                // Click after end -> extend forward
                newStartTime = selectedStartTime;
                newEndTime = slotEndTime;
            } else {
                // Click within range -> reset to this block
                newStartTime = slotTime;
                newEndTime = slotEndTime;
            }

            // Validate range: check if all slots in range are available
            const newStartTotal = toMinutes(newStartTime);
            const newEndTotal = toMinutes(newEndTime);
            let hasBookedSlotInRange = false;

            for (let currentMinutes = newStartTotal; currentMinutes < newEndTotal; currentMinutes += slotDuration) {
                const checkSlotTime = minutesToTimeString(currentMinutes);
                if (!isSlotAvailable(checkSlotTime)) {
                    hasBookedSlotInRange = true;
                    break;
                }
            }

            if (hasBookedSlotInRange) {
                alert('Khoảng thời gian này có slot đã được đặt. Vui lòng chọn khoảng thời gian khác.');
                return;
            }

            setSelectedStartTime(newStartTime);
            setSelectedEndTime(newEndTime);
            setBookingData(prev => ({
                ...prev,
                startTime: newStartTime,
                endTime: newEndTime,
            }));
        }
    };

    // Get available time slots (8-21 for coach)
    const getAvailableTimeSlots = (): string[] => {
        return Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
    };

    // Calculate booking amount
    const calculateBookingAmount = (): number => {
        if (!currentCoach?.price || !bookingData.startTime || !bookingData.endTime) return 0;
        const startHour = Number(bookingData.startTime.split(':')[0]);
        const endHour = Number(bookingData.endTime.split(':')[0]);
        if (endHour <= startHour) return 0;
        const hours = endHour - startHour;
        return Math.round((currentCoach.price || 0) * hours);
    };

    const formatVND = (value: number): string => {
        try {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
        } catch {
            return `${value.toLocaleString('vi-VN')} ₫`;
        }
    };

    // Fetch available slots when date changes
    useEffect(() => {
        if (coachId && bookingData.date) {
            fetchAvailableSlots(bookingData.date);
        }
    }, [coachId, bookingData.date, fetchAvailableSlots]);

    // Update selected times when bookingData changes
    useEffect(() => {
        if (bookingData.startTime) {
            setSelectedStartTime(bookingData.startTime);
        } else {
            setSelectedStartTime(null);
        }
        if (bookingData.endTime) {
            setSelectedEndTime(bookingData.endTime);
        } else {
            setSelectedEndTime(null);
        }
    }, [bookingData.startTime, bookingData.endTime]);

    const handleStep1Submit = () => {
        if (!bookingData.date || !bookingData.startTime || !bookingData.endTime) {
            alert('Vui lòng chọn đầy đủ ngày và giờ');
            return;
        }
        // FieldId is now optional - no validation needed
        setBookingData(prev => ({ ...prev, fieldId: prev.fieldId || undefined }));
        setCurrentStep(2); // Move to PersonalInfo step
    };

    const handlePersonalInfoSubmit = (formData: BookingFormData) => {
        setBookingData(prev => ({ ...prev, ...formData }));
        setCurrentStep(3); // Move to Payment step
    };

    const handleBack = () => {
        if (currentStep === 3) {
            setCurrentStep(2); // From Payment -> back to PersonalInfo
        } else if (currentStep === 2) {
            setCurrentStep(1); // From PersonalInfo -> back to Step 1
        } else {
            navigate(`/coaches/${coachId}`);
        }
    };

    if (detailLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loading size={48} className="text-green-600 mx-auto mb-4" />
                    <p className="text-muted-foreground">Đang tải thông tin huấn luyện viên...</p>
                </div>
            </div>
        );
    }

    if (currentStep === 1) {
        return (
            <>
                <NavbarDarkComponent />
                <PageWrapper>
                    <PageHeader title="Đặt lịch với huấn luyện viên" breadcrumbs={breadcrumbs} />

                    <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-10">
                        {/* Header Card */}
                        <Card className="border border-gray-200">
                            <CardContent className="p-6">
                                <div className="pb-10">
                                    <h1 className="text-2xl font-semibold text-center text-[#1a1a1a] mb-1">
                                        Đặt lịch với huấn luyện viên
                                    </h1>
                                </div>

                                {/* Coach Info */}
                                {currentCoach && (
                                    <div className="p-6 bg-gray-50 rounded-lg">
                                        <div className="flex items-start gap-4">
                                            {currentCoach.avatar && (
                                                <img
                                                    src={currentCoach.avatar}
                                                    alt={currentCoach.name}
                                                    className="w-24 h-24 rounded-lg object-cover"
                                                />
                                            )}
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-semibold text-[#1a1a1a] mb-2">
                                                    {currentCoach.name}
                                                </h2>
                                                <p className="text-base text-[#6b7280]">
                                                    {currentCoach.description || 'Huấn luyện viên chuyên nghiệp'}
                                                </p>
                                                <div className="mt-2 flex items-baseline gap-1">
                                                    <span className="text-2xl font-semibold text-emerald-600">
                                                        {formatVND(currentCoach.price || 0)}
                                                    </span>
                                                    <span className="text-sm text-gray-500">/giờ</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Main Content */}
                        <div className="flex flex-wrap gap-6">
                            {/* Booking Form */}
                            <div className="flex-1 min-w-[600px]">
                                <Card className="border border-gray-200">
                                    <CardHeader className="border-b border-gray-200">
                                        <CardTitle className="text-2xl font-semibold">
                                            Biểu mẫu đặt lịch
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        {/* Date Picker */}
                                        <div className="space-y-2.5">
                                            <DatePicker
                                                label="Ngày"
                                                value={bookingData.date ? new Date(bookingData.date + 'T00:00:00') : undefined}
                                                onChange={(day) => {
                                                    if (!day) {
                                                        setBookingData(prev => ({ ...prev, date: '' }));
                                                        setSelectedStartTime(null);
                                                        setSelectedEndTime(null);
                                                        setAvailabilityData(null);
                                                        return;
                                                    }
                                                    const yyyy = day.getFullYear();
                                                    const mm = String(day.getMonth() + 1).padStart(2, '0');
                                                    const dd = String(day.getDate()).padStart(2, '0');
                                                    const ymd = `${yyyy}-${mm}-${dd}`;
                                                    setBookingData(prev => ({ ...prev, date: ymd }));

                                                    // Reset time selection when date changes
                                                    setSelectedStartTime(null);
                                                    setSelectedEndTime(null);

                                                    // Fetch availability data for selected date
                                                    fetchAvailableSlots(ymd);
                                                }}
                                                disabled={(d) => {
                                                    // past dates => disabled
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const date = new Date(d);
                                                    date.setHours(0, 0, 0, 0);
                                                    return date < today;
                                                }}
                                                buttonClassName="h-14 bg-white border-0 text-left"
                                                popoverAlign="start"
                                                captionLayout="dropdown-months"
                                                fromDate={(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })()}
                                                toDate={(() => { const t = new Date(); t.setHours(0, 0, 0, 0); t.setMonth(t.getMonth() + 3); return t; })()}
                                            />
                                        </div>

                                        {/* Combined Time Range Selector */}
                                        <div className="space-y-2.5">
                                            <Label className="text-base font-normal">Chọn khung giờ</Label>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                {!bookingData.date ? (
                                                    <p className="text-sm text-gray-500 text-center py-4">
                                                        Vui lòng chọn ngày trước khi chọn giờ
                                                    </p>
                                                ) : loadingSlots ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <div className="flex items-center gap-3">
                                                            <Loading size={20} className="text-emerald-600" />
                                                            <p className="text-sm text-gray-600">
                                                                Đang tải thông tin khả dụng...
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : availabilityError ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-sm text-red-600 mb-2">
                                                            {availabilityError}
                                                        </p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => bookingData.date && fetchAvailableSlots(bookingData.date)}
                                                            className="text-xs"
                                                        >
                                                            Thử lại
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Legend */}
                                                        <div className="mb-4 flex items-center gap-4 flex-wrap text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                                                                <span>Trống</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 bg-red-500 rounded"></div>
                                                                <span>Đã đặt</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 bg-gray-400 rounded opacity-60"></div>
                                                                <span>Đã qua</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                                                                <span>Đã chọn</span>
                                                            </div>
                                                        </div>

                                                        {/* Grid Layout */}
                                                        <div className="overflow-x-auto">
                                                            {(() => {
                                                                const availableSlots = getAvailableTimeSlots();
                                                                const slotDuration = 60;

                                                                if (availableSlots.length === 0) {
                                                                    return (
                                                                        <p className="text-sm text-gray-500 text-center py-4 w-full">
                                                                            Không có khung giờ khả dụng
                                                                        </p>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="inline-block min-w-full">
                                                                        {/* Time Header Row */}
                                                                        <div className="flex border-b-2 border-gray-300 bg-blue-50 relative pt-6">
                                                                            <div className="w-24 shrink-0 border-r-2 border-gray-300 p-2 text-xs font-semibold text-center">
                                                                                Giờ
                                                                            </div>
                                                                            <div className="flex flex-1 relative">
                                                                                {/* First vertical line */}
                                                                                {availableSlots.length > 0 && (
                                                                                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-400 z-10">
                                                                                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap bg-blue-50 px-1">
                                                                                            {availableSlots[0]}
                                                                                        </div>
                                                                                    </div>
                                                                                )}

                                                                                {/* Slot cells with time labels */}
                                                                                {availableSlots.map((slotTime) => {
                                                                                    const slotEndTime = getSlotEndTime(slotTime, slotDuration);

                                                                                    return (
                                                                                        <div
                                                                                            key={`header-${slotTime}`}
                                                                                            className="flex-1 min-w-[60px] relative"
                                                                                        >
                                                                                            {/* Vertical line on the right with time label */}
                                                                                            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gray-400 z-10">
                                                                                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap bg-blue-50 px-1">
                                                                                                    {slotEndTime}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>

                                                                        {/* Slot Row */}
                                                                        <div className="flex border-b-2 border-gray-300 bg-white">
                                                                            <div className="w-24 shrink-0 border-r-2 border-gray-300 p-2 text-xs font-medium text-center bg-gray-50">
                                                                                {currentCoach?.name || 'HLV'}
                                                                            </div>
                                                                            <div className="flex flex-1">
                                                                                {availableSlots.map((slotTime) => {
                                                                                    const slotEndTime = getSlotEndTime(slotTime, slotDuration);

                                                                                    // Check if this slot is the start of selected range
                                                                                    const isStartSlot = selectedStartTime === slotTime;
                                                                                    // Check if this slot's end matches the selected end time
                                                                                    const isEndSlot = selectedEndTime === slotEndTime;

                                                                                    // Check if slot is within selected range
                                                                                    const isInRange = selectedStartTime !== null && selectedEndTime !== null
                                                                                        && (() => {
                                                                                            const startTotal = toMinutes(selectedStartTime);
                                                                                            const endTotal = toMinutes(selectedEndTime);
                                                                                            const slotTotal = toMinutes(slotTime);
                                                                                            const slotEndTotal = slotTotal + slotDuration;
                                                                                            // Slot is in range if it overlaps with selected range
                                                                                            return slotTotal < endTotal && slotEndTotal > startTotal;
                                                                                        })();

                                                                                    const isSlotBooked = !isSlotAvailable(slotTime);
                                                                                    const isSlotPast = isSlotInPast(slotTime, bookingData.date);
                                                                                    const isSlotDisabled = isSlotBooked || isSlotPast;

                                                                                    // Determine cell style
                                                                                    let cellStyle = "bg-white border-r border-gray-200 cursor-pointer hover:bg-emerald-50 transition-colors";
                                                                                    if (isSlotDisabled) {
                                                                                        if (isSlotPast) {
                                                                                            cellStyle = "bg-gray-400 border-r border-gray-200 cursor-not-allowed opacity-60";
                                                                                        } else {
                                                                                            cellStyle = "bg-red-500 border-r border-gray-200 cursor-not-allowed opacity-80";
                                                                                        }
                                                                                    } else if (isInRange) {
                                                                                        if (isStartSlot) {
                                                                                            cellStyle = "bg-emerald-600 border-r border-gray-200 cursor-pointer text-white font-semibold";
                                                                                        } else if (isEndSlot) {
                                                                                            cellStyle = "bg-emerald-600 border-r border-gray-200 cursor-pointer text-white font-semibold";
                                                                                        } else {
                                                                                            cellStyle = "bg-emerald-400 border-r border-gray-200 cursor-pointer text-white";
                                                                                        }
                                                                                    }

                                                                                    return (
                                                                                        <div
                                                                                            key={`slot-${slotTime}`}
                                                                                            className={`flex-1 min-w-[60px] h-12 flex items-center justify-center text-xs relative ${cellStyle}`}
                                                                                            onClick={() => {
                                                                                                if (isSlotDisabled) return;
                                                                                                handleSlotBlockClick(slotTime);
                                                                                            }}
                                                                                            title={isSlotPast ? "Đã qua" : isSlotBooked ? "Đã đặt" : `${slotTime} - ${slotEndTime}`}
                                                                                        >
                                                                                            {isStartSlot && selectedStartTime && "Bắt đầu"}
                                                                                            {isEndSlot && selectedEndTime && !isStartSlot && "Kết thúc"}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* Selection Info */}
                                                        <div className="mt-3 space-y-1">
                                                            {selectedStartTime !== null && (
                                                                <p className="text-sm text-emerald-600">
                                                                    Giờ bắt đầu: {selectedStartTime}
                                                                </p>
                                                            )}
                                                            {selectedEndTime !== null && (
                                                                <p className="text-sm text-emerald-600">
                                                                    Giờ kết thúc: {selectedEndTime}
                                                                </p>
                                                            )}
                                                            {selectedStartTime === null && (
                                                                <p className="text-sm text-gray-500">
                                                                    Nhấn vào ô để chọn giờ bắt đầu
                                                                </p>
                                                            )}
                                                            {selectedStartTime !== null && selectedEndTime === null && (
                                                                <p className="text-sm text-gray-500">
                                                                    Nhấn vào ô sau giờ bắt đầu để chọn giờ kết thúc
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Note */}
                                        <div className="space-y-2">
                                            <Label htmlFor="note" className="text-base font-normal">Ghi chú (tùy chọn)</Label>
                                            <Input
                                                id="note"
                                                type="text"
                                                placeholder="Ví dụ: Muốn học kỹ thuật ném bóng"
                                                value={bookingData.note || ''}
                                                onChange={(e) => setBookingData(prev => ({ ...prev, note: e.target.value }))}
                                                className="h-14 bg-gray-50 border-0"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Booking Details Sidebar */}
                            <div className="w-96">
                                <Card className="border border-gray-200">
                                    <CardHeader className="border-b border-gray-200">
                                        <CardTitle className="text-2xl font-semibold">
                                            Chi tiết đặt lịch
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-5">
                                        {/* Date */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                                <CalendarIcon className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <span className="text-base text-[#6b7280]">
                                                {bookingData.date || 'Chưa chọn ngày'}
                                            </span>
                                        </div>

                                        {/* Time */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                                <Clock className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-base text-[#6b7280]">
                                                    {bookingData.startTime && bookingData.endTime
                                                        ? `${bookingData.startTime} to ${bookingData.endTime}`
                                                        : 'Chưa chọn giờ'}
                                                </span>
                                                {bookingData.startTime && bookingData.endTime && (
                                                    <span className="text-sm text-emerald-600">
                                                        Thời lượng: {(() => {
                                                            const [startHour] = bookingData.startTime.split(':').map(Number);
                                                            const [endHour] = bookingData.endTime.split(':').map(Number);
                                                            const duration = endHour - startHour;
                                                            return duration > 0 ? `${duration} giờ` : 'Khoảng thời gian không hợp lệ';
                                                        })()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Coach Price */}
                                        {currentCoach && bookingData.startTime && bookingData.endTime && (
                                            <div className="pt-2">
                                                <Button
                                                    className="w-full h-auto py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-lg font-semibold"
                                                    disabled
                                                >
                                                    Tổng phụ: {formatVND(calculateBookingAmount())}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col items-center gap-3 py-5 bg-white/20 shadow-[0px_4px_44px_0px_rgba(211,211,211,0.25)]">
                            <div className="flex justify-center items-center gap-5">
                                <Button
                                    onClick={handleStep1Submit}
                                    disabled={!bookingData.date || !bookingData.startTime || !bookingData.endTime}
                                    className={`px-5 py-3 text-white ${(bookingData.date && bookingData.startTime && bookingData.endTime)
                                        ? 'bg-gray-800 hover:bg-gray-900'
                                        : 'bg-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    Tiếp tục
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </PageWrapper>
            </>
        );
    }

    // Step 2: PersonalInfo
    if (currentStep === 2) {
        return (
            <>
                <NavbarDarkComponent />
                <PageWrapper>
                    <PageHeader title="Đặt lịch với huấn luyện viên" breadcrumbs={breadcrumbs} />
                    <PersonalInfoCoach
                        coachId={coachId || ''}
                        bookingData={bookingData}
                        onSubmit={handlePersonalInfoSubmit}
                        onBack={handleBack}
                    />
                </PageWrapper>
            </>
        );
    }

    // Step 3: Payment (STK + QR + Upload receipt)
    return (
        <>
            <NavbarDarkComponent />
            <PageWrapper>
                <PageHeader title="Đặt lịch với huấn luyện viên" breadcrumbs={breadcrumbs} />
                <PaymentV2Coach
                    coachId={coachId || ''}
                    bookingData={bookingData}
                    onBack={handleBack}
                />
            </PageWrapper>
        </>
    );
};

export default CoachBookingPage;

