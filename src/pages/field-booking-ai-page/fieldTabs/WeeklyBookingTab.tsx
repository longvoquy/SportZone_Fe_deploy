import React, { useState } from 'react';
import { Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { WeeklyPatternSelector } from "@/components/booking/WeeklyPatternSelector";
import { Loading } from '@/components/ui/loading';
import { toast } from 'react-toastify';
import logger from '@/utils/logger';
import { useAppDispatch } from '@/store/hook';
import { validateWeeklyRecurringBooking } from "@/features/booking/bookingThunk";
import type { Field } from '@/types/field-type';
import type { BookingFormData } from './bookCourtAi';

interface WeeklyBookingData {
    startDate: string;
    endDate: string;
    daysOfWeek: string[]; // Updated to string[]
    numberOfWeeks: number; // Updated name
}

interface WeeklyBookingTabProps {
    venue: Field;
    courts: Array<{ _id: string; name: string }>;
    formData: BookingFormData;
    setFormData: React.Dispatch<React.SetStateAction<BookingFormData>>;
    onConflict: (conflicts: any[], contextData: any) => void;
    onSubmit: (payload: any) => void; // NEW: callback to pass payload to parent
    weeklyData: WeeklyBookingData;
    setWeeklyData: React.Dispatch<React.SetStateAction<WeeklyBookingData>>;
}

export const WeeklyBookingTab: React.FC<WeeklyBookingTabProps> = ({
    venue,
    courts,
    formData,
    setFormData,
    onConflict,
    onSubmit,
    weeklyData,
    setWeeklyData
}) => {
    const dispatch = useAppDispatch();
    const [isValidating, setIsValidating] = useState(false);

    // Check if all required fields are filled - using useMemo for reactive validation
    const isFormComplete = React.useMemo(() => {
        const isComplete = !!(
            weeklyData.startDate &&
            weeklyData.daysOfWeek.length > 0 &&
            formData.courtId &&
            formData.startTime &&
            formData.endTime
        );

        // Debug logging
        console.log('[WeeklyBookingTab] Validation Check:', {
            startDate: weeklyData.startDate,
            daysOfWeek: weeklyData.daysOfWeek,
            courtId: formData.courtId,
            startTime: formData.startTime,
            endTime: formData.endTime,
            isComplete
        });

        return isComplete;
    }, [weeklyData.startDate, weeklyData.daysOfWeek, formData.courtId, formData.startTime, formData.endTime]);

    // Helper functions for pricing
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

    // Generate dates for weekly booking (same logic as backend)
    const generateWeeklyDates = (): string[] => {
        if (!weeklyData.startDate || weeklyData.daysOfWeek.length === 0) return [];

        const startDate = new Date(weeklyData.startDate);
        const dates: string[] = [];
        const numberOfWeeks = weeklyData.numberOfWeeks || 4;

        // Map weekday names to JavaScript day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
        const dayMap: Record<string, number> = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6
        };

        // For each week
        for (let week = 0; week < numberOfWeeks; week++) {
            // For each weekday in the pattern
            for (const weekday of weeklyData.daysOfWeek) {
                const targetDayNumber = dayMap[weekday.toLowerCase()];
                if (targetDayNumber === undefined) continue;

                // Calculate the date for this weekday in this week
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + (week * 7));

                // Find the target weekday within this week
                const currentDayNumber = weekStart.getDay();
                let daysToAdd = targetDayNumber - currentDayNumber;

                // If target day is before current day in the week, go to next week
                if (daysToAdd < 0) {
                    daysToAdd += 7;
                }

                const targetDate = new Date(weekStart);
                targetDate.setDate(weekStart.getDate() + daysToAdd);

                // Format as YYYY-MM-DD
                const dateStr = targetDate.toISOString().split('T')[0];
                dates.push(dateStr);
            }
        }

        return dates;
    };

    // Calculate total price for weekly booking - calculate for each actual date
    const calculateTotalPrice = (): number => {
        if (!venue || !weeklyData.startDate || weeklyData.daysOfWeek.length === 0 || !formData.startTime || !formData.endTime) return 0;
        if (!venue.basePrice || venue.basePrice <= 0) return 0;

        try {
            const startTotal = toMinutes(formData.startTime);
            const endTotal = toMinutes(formData.endTime);
            if (endTotal <= startTotal) return 0;

            const slotDuration = venue.slotDuration || 60;

            // Generate actual dates for weekly booking
            const dates = generateWeeklyDates();
            if (dates.length === 0) return 0;

            let totalPrice = 0;

            // Calculate price for each actual date with its own multiplier
            dates.forEach(dateStr => {
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

    const handleWeeklyBooking = async () => {
        if (!weeklyData.startDate) {
            toast.error('Vui lòng chọn ngày bắt đầu');
            return;
        }

        if (weeklyData.daysOfWeek.length === 0) {
            toast.error('Vui lòng chọn ít nhất một ngày trong tuần');
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

        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;

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
            startDate: weeklyData.startDate,
            weekdays: weeklyData.daysOfWeek,
            startTime: formData.startTime,
            endTime: formData.endTime,
            numberOfWeeks: weeklyData.numberOfWeeks || 4,
        };

        try {
            // VALIDATE only - don't create booking yet
            const result = await dispatch(validateWeeklyRecurringBooking(payload)).unwrap();
            const responseData = (result as any).data || result;

            if (responseData.valid) {
                // No conflicts - pass payload to parent and continue to amenities
                toast.success(`Đã kiểm tra ${responseData.summary.totalDates} ngày - sân trống!`);
                onSubmit({ ...payload, type: 'weekly', summary: responseData.summary });
            } else if (responseData.conflicts && responseData.conflicts.length > 0) {
                // Has conflicts - show conflict modal
                onConflict(responseData.conflicts, {
                    type: 'weekly',
                    data: { ...payload, summary: responseData.summary }
                });
            }
        } catch (error: any) {
            logger.error('[WEEKLY BOOKING] Validation Error:', error);
            if (error.conflicts && Array.isArray(error.conflicts)) {
                // Try to extract summary if available in error response
                const summary = error.summary || error.response?.data?.summary;
                onConflict(error.conflicts, {
                    type: 'weekly',
                    data: { ...payload, summary }
                });
            } else {
                toast.error(error.message || 'Co loi xay ra khi kiem tra lich');
            }
        } finally {
            setIsValidating(false);
        }
    };

    // Map English weekdays to VN for display
    const WEEKDAY_LABEL_MAP: { [key: string]: string } = {
        'monday': 'T2', 'tuesday': 'T3', 'wednesday': 'T4',
        'thursday': 'T5', 'friday': 'T6', 'saturday': 'T7', 'sunday': 'CN'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-6">
                <Card className="border-none shadow-sm bg-white rounded-xl overflow-hidden">
                    <CardContent className="p-0">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-700">
                                    <Repeat className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Đặt định kỳ hàng tuần</h3>
                                    <p className="text-xs text-gray-500">Ví dụ: Thứ 2, 4, 6 hàng tuần trong 1 tháng</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {/* Court Selection */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Chọn sân con</Label>
                                    {courts.length === 0 ? (
                                        <p className="text-sm text-gray-500 py-2">Không có sân con nào</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {courts.map((court) => (
                                                <button
                                                    key={court._id || (court as any).id}
                                                    type="button"
                                                    onClick={() => {
                                                        const courtId = (court as any).id || court._id;
                                                        setFormData(prev => ({ ...prev, courtId, courtName: court.name }));
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

                                <WeeklyPatternSelector
                                    selectedWeekdays={weeklyData.daysOfWeek}
                                    onWeekdaysChange={(days) => setWeeklyData(prev => ({ ...prev, daysOfWeek: days }))}
                                    numberOfWeeks={weeklyData.numberOfWeeks}
                                    onNumberOfWeeksChange={(weeks) => setWeeklyData(prev => ({ ...prev, numberOfWeeks: weeks }))}
                                    startDate={weeklyData.startDate}
                                    onStartDateChange={(date) => setWeeklyData(prev => ({ ...prev, startDate: date || '' }))}
                                />

                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">Chọn khung giờ cố định</Label>

                                    {(!weeklyData.startDate) ? (
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
                                                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                                                    <span>Đã chọn</span>
                                                </div>
                                            </div>

                                            {/* Grid Layout */}
                                            <div className="overflow-x-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
                                                {(() => {
                                                    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                                                    const startD = new Date(weeklyData.startDate);
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
                                                                            const selectedDate = new Date(weeklyData.startDate);

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

                                                                        let cellClass = "bg-white hover:bg-blue-50 cursor-pointer";
                                                                        if (isPastSlot) {
                                                                            cellClass = "bg-gray-100 text-gray-400 cursor-not-allowed";
                                                                        } else if (isSelected) {
                                                                            cellClass = "bg-blue-400 text-white hover:bg-blue-500";
                                                                            if (isStart || isEnd) cellClass = "bg-blue-600 text-white font-semibold";
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

                                            {/* Slot Duration Info */}
                                            {formData.startTime && formData.endTime && (() => {
                                                const [startH, startM] = formData.startTime.split(':').map(Number);
                                                const [endH, endM] = formData.endTime.split(':').map(Number);
                                                const startTotal = startH * 60 + startM;
                                                const endTotal = endH * 60 + endM;
                                                const duration = endTotal - startTotal;
                                                const slotDuration = venue.slotDuration || 60;
                                                const numSlots = Math.floor(duration / slotDuration);

                                                if (duration > 0) {
                                                    return (
                                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                            <p className="text-blue-800 text-sm font-medium">
                                                                Mỗi ngày: {numSlots} slot x {slotDuration} phút = {duration} phút
                                                            </p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
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
                        <CardHeader className="pb-3 border-b bg-blue-50/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Repeat className="w-5 h-5 text-blue-700" />
                                Thông tin lịch cố định
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
                                    <span className="text-gray-500">Bắt đầu từ:</span>
                                    <span className="font-medium text-right">
                                        {weeklyData.startDate ? new Date(weeklyData.startDate).toLocaleDateString('vi-VN') : '...'}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-dashed">
                                    <span className="text-gray-500">Thứ trong tuần:</span>
                                    <span className="font-medium text-right">
                                        {weeklyData.daysOfWeek.length > 0
                                            ? weeklyData.daysOfWeek.map(d => WEEKDAY_LABEL_MAP[d.toLowerCase()] || d).join(', ')
                                            : '...'}
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
                            </div>

                            <div className="mt-4 pt-4 border-t bg-blue-50 -mx-6 px-6 pb-2">
                                <div className="flex justify-between items-end">
                                    <span className="text-gray-600 font-medium">Tạm tính:</span>
                                    <span className="text-2xl font-bold text-blue-700">
                                        {formData.startTime && formData.endTime && weeklyData.startDate && weeklyData.daysOfWeek.length > 0
                                            ? formatVND(calculateTotalPrice())
                                            : <span className="text-sm font-normal text-gray-500">(Chưa chọn đủ thông tin)</span>}
                                    </span>
                                </div>
                            </div>

                            <Button
                                className="w-full h-12 text-lg font-semibold shadow-lg bg-blue-700 hover:bg-blue-800 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                                onClick={handleWeeklyBooking}
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
