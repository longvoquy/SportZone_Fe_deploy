import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DateRangePickerV2 } from "@/components/booking/DateRangePickerV2";
import { Loading } from '@/components/ui/loading';
import { toast } from 'react-toastify';
import logger from '@/utils/logger';
import { useAppDispatch } from '@/store/hook';
import { validateConsecutiveDaysBooking } from "@/features/booking/bookingThunk";
import type { Field } from '@/types/field-type';

interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    courtId: string;
    courtName?: string;
}

interface ConsecutiveBookingTabProps {
    venue: Field;
    courts: Array<{ _id: string; name: string }>;
    formData: BookingFormData;
    setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
    onConflict: (conflicts: any[], contextData: any) => void;
    onSubmit: (payload: any) => void; // NEW: callback to pass payload to parent
    dateRange: { start: string; end: string };
    setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

export const ConsecutiveBookingTab: React.FC<ConsecutiveBookingTabProps> = ({
    venue,
    courts,
    formData,
    setFormData,
    onConflict,
    onSubmit,
    dateRange,
    setDateRange
}) => {
    const dispatch = useAppDispatch();
    const [isValidating, setIsValidating] = useState(false);

    // Check if all required fields are filled - using useMemo for reactive validation
    const isFormComplete = React.useMemo(() => {
        const isComplete = !!(
            dateRange.start &&
            dateRange.end &&
            formData.courtId &&
            formData.startTime &&
            formData.endTime
        );

        // Debug logging
        console.log('[ConsecutiveBookingTab] Validation Check:', {
            dateRange,
            courtId: formData.courtId,
            startTime: formData.startTime,
            endTime: formData.endTime,
            isComplete
        });

        return isComplete;
    }, [dateRange.start, dateRange.end, formData.courtId, formData.startTime, formData.endTime]);

    // Helper functions (copied from original)
    const toMinutes = (t: string): number => {
        const [hh = '00', mm = '00'] = (t || '00:00').split(':');
        return Number(hh) * 60 + Number(mm);
    };

    const minutesToTimeString = (minutes: number): string => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getDayName = (date: Date): string => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return dayNames[date.getDay()];
    };

    const getMultiplierFor = (day: string, timeHHmm: string): number => {
        const ranges = (venue?.priceRanges || []).filter(r => r.day === day);
        if (ranges.length === 0) return 1.0;
        const t = toMinutes(timeHHmm);
        const match = ranges.find(r => t >= toMinutes(r.start) && t < toMinutes(r.end));
        return match?.multiplier ?? 1.0;
    };

    const formatVND = (value: number): string => {
        try {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
        } catch {
            return `${value.toLocaleString('vi-VN')} ₫`;
        }
    };

    // Calculate total price for consecutive booking
    const calculateTotalPrice = (): number => {
        if (!venue || !dateRange.start || !dateRange.end || !formData.startTime || !formData.endTime) return 0;
        if (!venue.basePrice || venue.basePrice <= 0) return 0;

        try {
            const startTotal = toMinutes(formData.startTime);
            const endTotal = toMinutes(formData.endTime);
            if (endTotal <= startTotal) return 0;

            const slotDuration = venue.slotDuration || 60;
            let totalPrice = 0;

            // Calculate price for each operating date
            operatingDates.forEach(dateStr => {
                const date = new Date(dateStr + 'T00:00:00');
                const dayName = getDayName(date);

                // Calculate price for this day's time slot
                let dayPrice = 0;
                for (let currentMinutes = startTotal; currentMinutes < endTotal; currentMinutes += slotDuration) {
                    const slotStartTime = minutesToTimeString(currentMinutes);
                    const mult = getMultiplierFor(dayName, slotStartTime);
                    // Price per slot = (slotDuration / 60) * basePrice * multiplier
                    const slotPrice = (slotDuration / 60) * venue.basePrice * mult;
                    dayPrice += slotPrice;
                }

                totalPrice += dayPrice;
            });

            return Math.round(totalPrice);
        } catch (error) {
            logger.error('Error calculating total price:', error);
            return 0;
        }
    };

    const getOperatingDays = (): string[] => {
        if (!venue?.operatingHours) {
            return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        }
        const days = venue.operatingHours
            .filter(hour => hour && hour.day)
            .map(hour => hour.day.toLowerCase());

        return days.length > 0
            ? days
            : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    };

    // Calculate which dates in the range are operating days
    const { operatingDates, skippedDates } = React.useMemo(() => {
        if (!dateRange.start || !dateRange.end) {
            return { operatingDates: [], skippedDates: [] };
        }

        const operatingDays = getOperatingDays();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        const operating: string[] = [];
        const skipped: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            const dayName = dayNames[current.getDay()];
            const dateStr = current.toISOString().split('T')[0];

            if (operatingDays.includes(dayName)) {
                operating.push(dateStr);
            } else {
                skipped.push(dateStr);
            }
            current.setDate(current.getDate() + 1);
        }

        return { operatingDates: operating, skippedDates: skipped };
    }, [dateRange.start, dateRange.end, venue?.operatingHours]);

    const isDateDisabled = (date: Date): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return true;

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        const operatingDays = getOperatingDays();
        return !operatingDays.includes(dayName);
    };

    const handleConsecutiveBooking = async () => {
        if (!dateRange.start || !dateRange.end) {
            toast.error('Vui lòng chọn ngày bắt đầu và kết thúc');
            return;
        }

        if (!formData.courtId) {
            toast.error('Vui lòng chọn sân con (court)');
            return;
        }

        if (!formData.startTime || !formData.endTime) {
            toast.error('Vui lòng chọn khung giờ');
            return;
        }

        const startTotal = toMinutes(formData.startTime);
        const endTotal = toMinutes(formData.endTime);

        if (endTotal <= startTotal) {
            toast.error('Giờ kết thúc phải sau giờ bắt đầu');
            return;
        }

        setIsValidating(true);

        // Handle both 'id' and '_id' field names for venue, ensure it's a string
        const fieldId = String((venue as any).id || venue._id || '');

        const payload = {
            fieldId,
            courtId: formData.courtId,
            startDate: dateRange.start,
            endDate: dateRange.end,
            startTime: formData.startTime,
            endTime: formData.endTime,
        };

        console.log('[CONSECUTIVE BOOKING] Payload:', payload);

        try {
            // VALIDATE only - don't create booking yet
            const result = await dispatch(validateConsecutiveDaysBooking(payload)).unwrap();
            const responseData = (result as any).data || result;

            if (responseData.valid) {
                // No conflicts - pass payload to parent and continue to amenities
                toast.success(`Đã kiểm tra ${responseData.summary.totalDates} ngày - sân trống!`);
                onSubmit({ ...payload, type: 'consecutive', summary: responseData.summary });
            } else if (responseData.conflicts && responseData.conflicts.length > 0) {
                // Has conflicts - show conflict modal
                onConflict(responseData.conflicts, {
                    type: 'consecutive',
                    data: { ...payload, summary: responseData.summary }
                });
            }
        } catch (error: any) {
            logger.error('[CONSECUTIVE BOOKING] Validation Error:', error);

            if (error.conflicts && Array.isArray(error.conflicts)) {
                // Try to extract summary if available in error response
                const summary = error.summary || error.response?.data?.summary;
                onConflict(error.conflicts, {
                    type: 'consecutive',
                    data: { ...payload, summary }
                });
            } else {
                toast.error(error.message || 'Có lỗi xảy ra khi kiểm tra lịch');
            }
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-6">
                <Card className="border-none shadow-sm bg-white rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b border-green-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-100 rounded-lg text-[#00775C]">
                                    <CalendarIcon className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Chọn khoảng ngày</h3>
                                    <p className="text-xs text-gray-500">Đặt một khung giờ cố định cho nhiều ngày liên tiếp</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Court Selection */}
                                <div className="space-y-2 col-span-1 md:col-span-2">
                                    <Label className="text-sm font-medium text-gray-700">Chọn sân con</Label>
                                    {courts.length === 0 ? (
                                        <p className="text-sm text-gray-500 py-2">Không có sân con nào</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {courts.map((court, index) => (
                                                <button
                                                    key={court._id || `court-${index}`}
                                                    type="button"
                                                    onClick={() => {
                                                        // Handle both 'id' and '_id' field names
                                                        const courtId = (court as any).id || court._id;
                                                        console.log('[Court Click]', { court, courtId, currentFormData: formData });
                                                        setFormData(prev => {
                                                            console.log('[Court Click] Previous state:', prev);
                                                            const newState = { ...prev, courtId, courtName: court.name };
                                                            console.log('[Court Click] New state:', newState);
                                                            return newState;
                                                        });
                                                    }}
                                                    className={`px-4 py-2 rounded-lg border transition-colors ${formData.courtId === ((court as any).id || court._id)
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500'
                                                        }`}
                                                >
                                                    {court.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <DateRangePickerV2
                                    startDate={dateRange.start}
                                    endDate={dateRange.end}
                                    onStartDateChange={(date) => {
                                        setDateRange(prev => ({ ...prev, start: date }));
                                    }}
                                    onEndDateChange={(date) => {
                                        setDateRange(prev => ({ ...prev, end: date }));
                                    }}
                                    disabled={isDateDisabled}
                                    label="Chọn khoảng ngày"
                                />

                                {/* Time Selection for Consecutive Mode */}
                                <div className="space-y-3 col-span-1 md:col-span-2">
                                    <Label className="text-sm font-medium text-gray-700">Khung giờ cố định</Label>

                                    {(!dateRange.start) ? (
                                        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                            Vui lòng chọn ngày bắt đầu để xem khung giờ
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {/* Legend */}
                                            <div className="flex items-center gap-4 flex-wrap text-sm mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
                                                    <span>Trống</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                                                    <span>Đã chọn</span>
                                                </div>
                                            </div>

                                            {/* Grid Layout */}
                                            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
                                                {(() => {
                                                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                                    const startD = new Date(dateRange.start);
                                                    const dayName = dayNames[startD.getDay()];

                                                    let operatingHour = venue.operatingHours?.find(h => h && h.day && h.day.toLowerCase() === dayName);

                                                    if (!operatingHour) {
                                                        const firstAvailable = venue.operatingHours?.find(h => h && h.start && h.end);
                                                        if (firstAvailable) {
                                                            operatingHour = firstAvailable;
                                                        } else {
                                                            operatingHour = { start: '05:00', end: '23:00', day: dayName, duration: 0 };
                                                        }
                                                    }

                                                    const slotDuration = venue.slotDuration || 60;
                                                    const [startH, startM] = operatingHour.start.split(':').map(Number);
                                                    const [endH, endM] = operatingHour.end.split(':').map(Number);
                                                    const startMinutes = startH * 60 + (startM || 0);
                                                    const endMinutes = endH * 60 + (endM || 0);

                                                    const slots: string[] = [];
                                                    for (let m = startMinutes; m < endMinutes; m += slotDuration) {
                                                        const h = Math.floor(m / 60);
                                                        const min = m % 60;
                                                        slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                                                    }

                                                    if (slots.length === 0) {
                                                        return <p className="text-center py-4">Không có slot khả dụng</p>;
                                                    }

                                                    return (
                                                        <div className="inline-block min-w-full">
                                                            {/* Header Row */}
                                                            <div className="flex border-b border-gray-300 bg-blue-50/50 relative pt-6">
                                                                <div className="w-20 shrink-0 border-r border-gray-300 p-2 text-xs font-semibold text-center">Giờ</div>
                                                                <div className="flex flex-1 relative">
                                                                    <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300 z-10">
                                                                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 bg-blue-50 px-1">
                                                                            {slots[0]}
                                                                        </div>
                                                                    </div>
                                                                    {slots.map((time, index) => {
                                                                        const [h, m] = time.split(':').map(Number);
                                                                        const endMTotal = h * 60 + m + slotDuration;
                                                                        const endHStr = Math.floor(endMTotal / 60).toString().padStart(2, '0');
                                                                        const endMStr = (endMTotal % 60).toString().padStart(2, '0');
                                                                        const endTime = `${endHStr}:${endMStr}`;

                                                                        return (
                                                                            <div key={`header-slot-${time}-${index}`} className="flex-1 min-w-[60px] relative">
                                                                                <div className="absolute right-0 top-0 bottom-0 w-px bg-gray-300 z-10">
                                                                                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 bg-blue-50 px-1">
                                                                                        {endTime}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Slots Row */}
                                                            <div className="flex bg-white">
                                                                <div className="w-20 shrink-0 border-r border-gray-300 p-2 text-xs font-medium text-center flex items-center justify-center bg-gray-50">

                                                                </div>
                                                                <div className="flex flex-1">
                                                                    {slots.map((time, index) => {
                                                                        const [h, m] = time.split(':').map(Number);
                                                                        const currentTotal = h * 60 + m;

                                                                        const getSlotEnd = (t: string) => {
                                                                            const [hh, mm] = t.split(':').map(Number);
                                                                            const endMin = hh * 60 + mm + slotDuration;
                                                                            const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
                                                                            const endM = (endMin % 60).toString().padStart(2, '0');
                                                                            return `${endH}:${endM}`;
                                                                        };

                                                                        const slotEndTime = getSlotEnd(time);

                                                                        // Check if this slot is in the past for today's date
                                                                        const isPastSlot = (() => {
                                                                            const today = new Date();
                                                                            const selectedDate = new Date(dateRange.start);

                                                                            // Only check for today
                                                                            if (selectedDate.toDateString() !== today.toDateString()) {
                                                                                return false;
                                                                            }

                                                                            // Get current time in minutes
                                                                            const currentHour = today.getHours();
                                                                            const currentMinute = today.getMinutes();
                                                                            const currentTimeInMinutes = currentHour * 60 + currentMinute;

                                                                            // Slot end time in minutes
                                                                            const [endH, endM] = slotEndTime.split(':').map(Number);
                                                                            const slotEndInMinutes = endH * 60 + endM;

                                                                            // Disable if slot ends before or at current time
                                                                            return slotEndInMinutes <= currentTimeInMinutes;
                                                                        })();

                                                                        let isSelected = false;
                                                                        let isStart = false;
                                                                        let isEnd = false;

                                                                        if (formData.startTime && formData.endTime) {
                                                                            const [sH, sM] = formData.startTime.split(':').map(Number);
                                                                            const [eH, eM] = formData.endTime.split(':').map(Number);
                                                                            const sTotal = sH * 60 + sM;
                                                                            const eTotal = eH * 60 + eM;

                                                                            if (currentTotal >= sTotal && currentTotal < eTotal) {
                                                                                isSelected = true;
                                                                            }
                                                                            if (currentTotal === sTotal) isStart = true;
                                                                            if (currentTotal + slotDuration === eTotal) isEnd = true;
                                                                        }

                                                                        let cellClass = "bg-white hover:bg-emerald-50 cursor-pointer";
                                                                        if (isPastSlot) {
                                                                            cellClass = "bg-gray-100 text-gray-400 cursor-not-allowed";
                                                                        } else if (isSelected) {
                                                                            cellClass = "bg-emerald-400 text-white hover:bg-emerald-500";
                                                                            if (isStart || isEnd) cellClass = "bg-emerald-600 text-white font-semibold";
                                                                        }

                                                                        return (
                                                                            <div
                                                                                key={`slot-${time}-${index}`}
                                                                                className={`flex-1 min-w-[60px] h-12 border-r border-gray-100 flex items-center justify-center text-xs transition-colors ${cellClass}`}
                                                                                onClick={() => {
                                                                                    // Prevent clicking past slots
                                                                                    if (isPastSlot) {
                                                                                        toast.warning('Không thể chọn khung giờ đã qua');
                                                                                        return;
                                                                                    }

                                                                                    const [h, m] = time.split(':').map(Number);
                                                                                    const clickedStart = h * 60 + m;

                                                                                    if (formData.startTime && formData.endTime) {
                                                                                        const [sH, sM] = formData.startTime.split(':').map(Number);
                                                                                        const [eH, eM] = formData.endTime.split(':').map(Number);
                                                                                        const currentStartTotal = sH * 60 + sM;
                                                                                        const currentEndTotal = eH * 60 + eM;

                                                                                        if (clickedStart >= currentStartTotal && clickedStart < currentEndTotal) {
                                                                                            setFormData(p => ({ ...p, startTime: '', endTime: '' }));
                                                                                            return;
                                                                                        }

                                                                                        let newStartTime = formData.startTime;
                                                                                        let newEndTime = formData.endTime;

                                                                                        if (clickedStart < currentStartTotal) {
                                                                                            newStartTime = time;
                                                                                        } else if (clickedStart >= currentEndTotal) {
                                                                                            newEndTime = slotEndTime;
                                                                                        }
                                                                                        setFormData(p => ({ ...p, startTime: newStartTime, endTime: newEndTime }));
                                                                                        return;
                                                                                    }

                                                                                    setFormData(p => ({
                                                                                        ...p,
                                                                                        startTime: time,
                                                                                        endTime: slotEndTime
                                                                                    }));
                                                                                }}
                                                                            >
                                                                                {isSelected && (isStart ? "Bắt đầu" : isEnd ? "Kết thúc" : "")}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">*Khung giờ này sẽ áp dụng cho tất cả các ngày đã chọn</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Summary & Validation */}
            <div className="md:col-span-4 space-y-6">
                <div className="sticky top-24">
                    <Card className="border shadow-lg bg-white/95 backdrop-blur-sm z-20">
                        <CardHeader className="pb-3 border-b bg-green-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[#00775C]" />
                                Thông tin đặt sân
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-1 border-b border-dashed">
                                    <span className="text-gray-500">Sân:</span>
                                    <span className="font-medium text-right">{venue.name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-dashed">
                                    <span className="text-gray-500">Sân con:</span>
                                    <span className="font-medium text-right">{courts.find(c => c._id === formData.courtId)?.name || 'Chưa chọn'}</span>
                                </div>

                                <div className="flex justify-between py-1 border-b border-dashed">
                                    <span className="text-gray-500">Chuỗi ngày:</span>
                                    <span className="font-medium text-right">
                                        {dateRange.start ? new Date(dateRange.start).toLocaleDateString('vi-VN') : '...'}
                                        {' -> '}
                                        {dateRange.end ? new Date(dateRange.end).toLocaleDateString('vi-VN') : '...'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1 border-b border-dashed">
                                    <span className="text-gray-500">Thời gian:</span>
                                    <span className="font-medium text-right">
                                        {formData.startTime && formData.endTime
                                            ? `${formData.startTime} - ${formData.endTime}`
                                            : '---'}
                                    </span>
                                </div>

                                {/* Operating Days Info */}
                                {operatingDates.length > 0 && (
                                    <div className="flex justify-between py-1 border-b border-dashed">
                                        <span className="text-gray-500">Số ngày đặt:</span>
                                        <span className="font-semibold text-emerald-600">{operatingDates.length} ngày</span>
                                    </div>
                                )}

                                {/* Skipped Days Warning */}
                                {skippedDates.length > 0 && (
                                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <p className="text-amber-800 text-xs font-medium mb-1">
                                            {skippedDates.length} ngày sẽ bị bỏ qua (sân không hoạt động):
                                        </p>
                                        <p className="text-amber-700 text-xs">
                                            {skippedDates
                                                .map(d => new Date(d).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }))
                                                .join(', ')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t bg-green-50 -mx-6 px-6 pb-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-gray-600 font-medium">Tạm tính:</span>
                                    <span className="text-2xl font-bold text-[#00775C]">
                                        {formData.startTime && formData.endTime && dateRange.start && dateRange.end && operatingDates.length > 0
                                            ? formatVND(calculateTotalPrice())
                                            : <span className="text-sm font-normal text-gray-500">(Chưa chọn đủ thông tin)</span>}
                                    </span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg font-semibold shadow-lg bg-[#00775C] hover:bg-[#006650] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={handleConsecutiveBooking}
                                disabled={isValidating || !isFormComplete}
                            >
                                {isValidating ? <Loading /> : 'Kiểm tra và tiếp tục'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
