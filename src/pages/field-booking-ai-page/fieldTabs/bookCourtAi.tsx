import React, { useEffect, useState, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker } from "@/components/ui/date-picker";
import { DateRangePicker } from "@/components/booking/DateRangePicker";
import WeeklyPatternSelector from "@/components/booking/WeeklyPatternSelector";
import NaturalLanguageInput from "@/components/booking/NaturalLanguageInput";
import type { Field, FieldAvailabilityData } from '@/types/field-type';
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { checkFieldAvailability } from '@/features/field/fieldThunk';
import {
    createConsecutiveDaysBooking,
    createWeeklyRecurringBooking,
    createFieldBooking // Import single booking action for batch fallback
} from "@/features/booking/bookingThunk";
import { Loading } from '@/components/ui/loading';
import logger from '@/utils/logger';
import { toast } from 'react-toastify';
import { BookingConflictModal } from '@/components/booking/BookingConflictModal'; // Import Conflict Modal
import type { ConflictItem, ResolutionMap } from '@/components/booking/BookingConflictModal';
import type { CreateFieldBookingPayload } from '@/types/booking-type'; // Import payload type

/**
 * Interface for booking form data
 */
interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    courtId: string;
    courtName?: string;
    name?: string;
    email?: string;
    phone?: string;
}

/**
 * Props for BookCourtTab component
 */
interface BookCourtAiTabProps {
    /**
     * Venue information to display
     */
    venue?: Field;
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
    courtsError?: string | null;
}

/**
 * BookCourtAiTab component - Displays advanced booking form with AI and Multi-day support
 */
export const BookCourtAiTab: React.FC<BookCourtAiTabProps> = ({
    venue: venueProp,
    onSubmit,
    onBack,
    courts = [],
    courtsError,
}) => {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const currentField = useAppSelector((state) => state.field.currentField);
    const venue = (venueProp || currentField || (location.state as any)?.venue) as Field | undefined;

    // Log field data usage in BookCourt tab
    logger.debug('[BOOK COURT TAB] Field data loaded:', {
        hasVenueProp: !!venueProp,
        hasCurrentField: !!currentField,
        hasLocationState: !!(location.state as any)?.venue,
        finalVenue: venue ? {
            id: venue.id,
            name: venue.name,
            location: venue.location,
            basePrice: venue.basePrice,
            sportType: venue.sportType,
            operatingHours: venue.operatingHours
        } : null
    });
    const navigate = useNavigate();
    const [formData, setFormData] = useState<BookingFormData>({
        date: '',
        startTime: '',
        endTime: '',
        courtId: '',
        courtName: '',
    });
    // === Thêm state cho giờ bắt đầu & kết thúc (time strings HH:mm) ===
    const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
    const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);

    // === State cho availability data ===
    const [availabilityData, setAvailabilityData] = useState<FieldAvailabilityData | null>(null);
    const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);

    // === Turn 1 & 2: Booking Modes State ===
    const [bookingMode, setBookingMode] = useState<'single' | 'consecutive' | 'weekly'>('single');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isCreatingConsecutiveBooking, setIsCreatingConsecutiveBooking] = useState(false);

    // Turn 2: Weekly Recurring State
    const [weeklyData, setWeeklyData] = useState<{
        startDate: string;
        weekdays: string[];
        numberOfWeeks: number;
    }>({
        startDate: '',
        weekdays: [],
        numberOfWeeks: 4
    });
    const [isCreatingWeeklyBooking, setIsCreatingWeeklyBooking] = useState(false);

    // Turn 3: AI Mode State
    const [isAiMode, setIsAiMode] = useState(false);

    // === Conflict Handling State ===
    const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);

    // Context for conflict resolution (to know what we were trying to book)
    const [pendingBookingContext, setPendingBookingContext] = useState<{
        type: 'consecutive' | 'weekly';
        data: any;
    } | null>(null);

    // Initial check for AI mode from navigation
    useEffect(() => {
        if (location.state?.mode === 'ai') {
            setIsAiMode(true);
        }
    }, [location.state]);

    // === Helper functions for operating hours ===
    const getOperatingDays = (): string[] => {
        if (!venue?.operatingHours || venue.operatingHours.length === 0) {
            return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        }
        return venue.operatingHours.map(hour => hour.day);
    };

    const getOperatingHoursForDay = (dayName: string) => {
        if (!venue?.operatingHours) return null;
        return venue.operatingHours.find(hour => hour.day === dayName);
    };

    // === Pricing helpers using field.priceRanges ===
    const toMinutes = (t: string): number => {
        const [hh = '00', mm = '00'] = (t || '00:00').split(':');
        return Number(hh) * 60 + Number(mm);
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

    const isDateDisabled = (date: Date): boolean => {
        // Disable past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
            return true;
        }

        // Disable days not in operating hours
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        const operatingDays = getOperatingDays();
        const isOperatingDay = operatingDays.includes(dayName);

        return !isOperatingDay;
    };

    // Helper function to format minutes to HH:mm
    const minutesToTimeString = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const getAvailableTimeSlots = (selectedDate: Date): string[] => {
        if (!selectedDate || !venue?.operatingHours) {
            return [];
        }

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[selectedDate.getDay()];
        const operatingHour = getOperatingHoursForDay(dayName);

        if (!operatingHour) {
            return [];
        }

        // Get slotDuration from venue (default to 60 minutes if not available)
        const slotDuration = venue.slotDuration || 60;

        // Parse operating hours to minutes
        const startHour = parseInt(operatingHour.start.split(':')[0]);
        const startMinute = parseInt(operatingHour.start.split(':')[1] || '0');
        const endHour = parseInt(operatingHour.end.split(':')[0]);
        const endMinute = parseInt(operatingHour.end.split(':')[1] || '0');

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // Generate slots based on slotDuration (same logic as backend)
        const slots: string[] = [];
        for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotDuration) {
            const slotEndMinutes = currentMinutes + slotDuration;
            if (slotEndMinutes > endMinutes) break;

            const startTime = minutesToTimeString(currentMinutes);
            slots.push(startTime);
        }

        return slots;
    };

    // === Function để fetch availability data ===
    const fetchAvailabilityData = useCallback(async (selectedDate: string, courtId?: string) => {
        if (!venue?.id || !selectedDate || !courtId) {
            return;
        }

        setIsLoadingAvailability(true);
        setAvailabilityError(null);

        try {
            const result = await dispatch(checkFieldAvailability({
                id: venue.id,
                startDate: selectedDate,
                endDate: selectedDate,
                courtId,
            })).unwrap();

            if (result.success && result.data && result.data.length > 0) {
                // Tìm data cho ngày được chọn
                const dayData = result.data.find(item => item.date === selectedDate);
                setAvailabilityData(dayData || null);
            } else {
                setAvailabilityData(null);
            }
        } catch (error: any) {
            setAvailabilityError(error.message || 'Không thể tải thông tin khả dụng');
            setAvailabilityData(null);
        } finally {
            setIsLoadingAvailability(false);
        }
    }, [venue?.id, dispatch]);

    // === Function để check xem slot có available không ===
    const isSlotAvailable = (timeString: string): boolean => {
        if (!availabilityData || !availabilityData.slots) {
            return true; // Nếu không có data, assume available
        }
        const slot = availabilityData.slots.find(s => s.startTime === timeString);
        if (!slot) return true;
        return slot.available;
    };

    // === Function để check xem slot có đã qua chưa (nếu là ngày hôm nay) ===
    const isSlotInPast = (slotTime: string, selectedDate: string): boolean => {
        if (!selectedDate) return false;
        const today = new Date();
        const selected = new Date(selectedDate + 'T00:00:00');
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const selectedDateOnly = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

        if (selectedDateOnly.getTime() !== todayDateOnly.getTime()) return false;

        const [slotHour, slotMinute] = slotTime.split(':').map(Number);
        const slotTotal = slotHour * 60 + slotMinute;
        const nowTotal = today.getHours() * 60 + today.getMinutes();

        return slotTotal < nowTotal;
    };

    // Helper function to calculate endTime of a slot
    const getSlotEndTime = (startTime: string): string => {
        const slotDuration = venue?.slotDuration || 60;
        const startTotal = toMinutes(startTime);
        const endTotal = startTotal + slotDuration;
        return minutesToTimeString(endTotal);
    };

    // === Xử lý khi click slot - chọn theo block ===
    const handleSlotBlockClick = (slotTime: string) => {
        // Check if slot is in the past
        if (isSlotInPast(slotTime, formData.date)) {
            alert('Không thể chọn khung giờ đã qua. Vui lòng chọn khung giờ khác.');
            return;
        }

        const slotDuration = venue?.slotDuration || 60;
        const slotEndTime = getSlotEndTime(slotTime);

        // Check if clicking on a slot that's already in the selected range - deselect if yes
        if (selectedStartTime !== null && selectedEndTime !== null) {
            const [startHour, startMin] = selectedStartTime.split(':').map(Number);
            const [endHour, endMin] = selectedEndTime.split(':').map(Number);
            const [clickedHour, clickedMin] = slotTime.split(':').map(Number);

            const startTotal = startHour * 60 + startMin;
            const endTotal = endHour * 60 + endMin;
            const clickedTotal = clickedHour * 60 + clickedMin;

            // If clicked slot is within current range, deselect (clear selection)
            if (clickedTotal >= startTotal && clickedTotal < endTotal) {
                setSelectedStartTime(null);
                setSelectedEndTime(null);
                setFormData((prev) => ({
                    ...prev,
                    startTime: '',
                    endTime: '',
                }));
                return;
            }
        }

        if (selectedStartTime === null) {
            // Chọn block đầu tiên: set cả start và end của block đó
            setSelectedStartTime(slotTime);
            setSelectedEndTime(slotEndTime);
            setFormData((prev) => ({
                ...prev,
                startTime: slotTime,
                endTime: slotEndTime,
            }));
        } else {
            // Đã có selection: extend range
            const [currentStartHour, currentStartMin] = selectedStartTime.split(':').map(Number);
            const [currentEndHour, currentEndMin] = (selectedEndTime || getSlotEndTime(selectedStartTime)).split(':').map(Number);
            const [clickedHour, clickedMin] = slotTime.split(':').map(Number);

            const currentStartTotal = currentStartHour * 60 + currentStartMin;
            const currentEndTotal = currentEndHour * 60 + currentEndMin;
            const clickedTotal = clickedHour * 60 + clickedMin;

            // Determine new range based on clicked slot position
            let newStartTime: string;
            let newEndTime: string;

            if (clickedTotal < currentStartTotal) {
                // Click vào slot trước start -> extend về trước
                newStartTime = slotTime;
                newEndTime = selectedEndTime || getSlotEndTime(selectedStartTime);
            } else if (clickedTotal >= currentEndTotal) {
                // Click vào slot sau end -> extend về sau
                newStartTime = selectedStartTime;
                newEndTime = slotEndTime;
            } else {
                // Click vào slot trong range -> reset về block đó
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
            setFormData((prev) => ({
                ...prev,
                startTime: newStartTime,
                endTime: newEndTime,
            }));
        }
    };
    // Prefill form from sessionStorage if available
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('bookingFormData');
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (
                parsed &&
                typeof parsed === 'object' &&
                ('date' in parsed || 'startTime' in parsed || 'endTime' in parsed || 'courtId' in parsed)
            ) {
                setFormData(prev => ({
                    date: parsed.date ?? prev.date,
                    startTime: parsed.startTime ?? prev.startTime,
                    endTime: parsed.endTime ?? prev.endTime,
                    courtId: parsed.courtId ?? prev.courtId,
                    courtName: parsed.courtName ?? prev.courtName,
                    name: parsed.name ?? prev.name,
                    email: parsed.email ?? prev.email,
                    phone: parsed.phone ?? prev.phone,
                }));

                // Cập nhật selectedStartTime và selectedEndTime từ sessionStorage
                if (parsed.startTime) {
                    setSelectedStartTime(parsed.startTime);
                }
                if (parsed.endTime) {
                    setSelectedEndTime(parsed.endTime);
                }

                // Fetch availability data if date is available
                if (parsed.date && venue?.id && (parsed.courtId || courts[0]?.id)) {
                    const targetCourtId = parsed.courtId || courts[0]?.id;
                    setFormData(prev => ({
                        ...prev,
                        courtId: targetCourtId,
                        courtName: prev.courtName || courts.find(c => c.id === targetCourtId)?.name || prev.courtName,
                    }));
                    fetchAvailabilityData(parsed.date, targetCourtId);
                }
            }
        } catch {
            // Ignore malformed storage
            logger.warn('Failed to parse bookingFormData from sessionStorage');
        }
    }, [venue?.id, courts, fetchAvailabilityData]); // Add dependencies

    // Default select first court when list is available
    useEffect(() => {
        if (courts.length > 0 && !formData.courtId) {
            setFormData(prev => ({
                ...prev,
                courtId: courts[0].id,
                courtName: courts[0].name,
            }));
        }
    }, [courts, formData.courtId]);

    const handleAiParsed = useCallback((data: any) => {
        logger.debug('[AI PARSED]', data);

        if (data.type === 'single' && data.startDate) {
            setBookingMode('single');
            setFormData(prev => ({
                ...prev,
                date: data.startDate,
                startTime: data.startTime || prev.startTime,
                endTime: data.endTime || prev.endTime
            }));
            if (data.startTime) setSelectedStartTime(data.startTime);
            if (data.endTime) setSelectedEndTime(data.endTime);
            fetchAvailabilityData(data.startDate, formData.courtId || courts[0]?.id);
        } else if (data.type === 'consecutive' && data.startDate && data.endDate) {
            setBookingMode('consecutive');
            setDateRange({ start: data.startDate, end: data.endDate });
            setFormData(prev => ({
                ...prev,
                startTime: data.startTime || prev.startTime,
                endTime: data.endTime || prev.endTime
            }));
            if (data.startTime) setSelectedStartTime(data.startTime);
            if (data.endTime) setSelectedEndTime(data.endTime);
        } else if (data.type === 'weekly' && data.startDate) {
            setBookingMode('weekly');
            setWeeklyData({
                startDate: data.startDate,
                weekdays: data.weekdays || [],
                numberOfWeeks: data.numberOfWeeks || 4
            });
            setFormData(prev => ({
                ...prev,
                startTime: data.startTime || prev.startTime,
                endTime: data.endTime || prev.endTime
            }));
            if (data.startTime) setSelectedStartTime(data.startTime);
            if (data.endTime) setSelectedEndTime(data.endTime);
        }

        if (data.explanation) {
            toast.info(data.explanation, {
                icon: <Sparkles className="text-indigo-500 h-5 w-5" />,
                position: "top-center"
            });
        }
    }, [courts, formData.courtId, fetchAvailabilityData]);

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

    const calculateSubtotal = (): number => {
        if (!venue || !formData.date || !formData.startTime || !formData.endTime) return 0;
        try {
            const dayName = getDayName(new Date(formData.date + 'T00:00:00'));
            const startTotal = toMinutes(formData.startTime);
            const endTotal = toMinutes(formData.endTime);
            if (endTotal <= startTotal) return 0;

            // Calculate based on slotDuration
            const slotDuration = venue.slotDuration || 60;
            let total = 0;

            // Iterate through each slot in the booking range
            for (let currentMinutes = startTotal; currentMinutes < endTotal; currentMinutes += slotDuration) {
                const slotStartTime = minutesToTimeString(currentMinutes);
                const mult = getMultiplierFor(dayName, slotStartTime);
                const slotPrice = (slotDuration / 60) * (venue.basePrice || 0) * mult;
                total += slotPrice;
            }
            return Math.round(total);
        } catch {
            return 0;
        }
    };

    const formatVND = (value: number): string => {
        try {
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
        } catch {
            return `${value.toLocaleString('vi-VN')} ₫`;
        }
    };

    // === Conflict Resolution Logic ===

    /**
     * Helper to generate date list between start and end (inclusive)
     */
    const getDatesInRange = (startDate: string, endDate: string) => {
        const dates: string[] = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    /**
     * Helper to generate dates for weekly recurring pattern
     */
    const getDatesForWeeklyPattern = (startDate: string, weekdays: string[], weeks: number) => {
        const dates: string[] = [];
        const start = new Date(startDate);
        const dayMap: Record<string, number> = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
        };
        const targetDays = weekdays.map(d => dayMap[d.toLowerCase()]);

        // Iterate through weeks
        for (let i = 0; i < weeks; i++) {
            // Iterate through 7 days of the week
            for (let j = 0; j < 7; j++) {
                const current = new Date(start);
                current.setDate(start.getDate() + (i * 7) + j);

                if (targetDays.includes(current.getDay())) {
                    dates.push(current.toISOString().split('T')[0]);
                }
            }
        }
        return dates;
    };

    /**
     * Handle conflict resolution submission from Modal
     */
    const handleConflictResolution = async (resolutions: ResolutionMap) => {
        setIsResolvingConflicts(true);
        try {
            if (!pendingBookingContext || !venue?.id) {
                throw new Error('Missing booking context');
            }

            const { type, data } = pendingBookingContext;
            let allDates: string[] = [];

            // 1. Determine all intended dates
            if (type === 'consecutive') {
                allDates = getDatesInRange(data.startDate, data.endDate);
            } else if (type === 'weekly') {
                allDates = getDatesForWeeklyPattern(data.startDate, data.weekdays, data.numberOfWeeks);
            }

            // 2. Filter dates based on resolution (skip vs keep)
            const bookingsToCreate: CreateFieldBookingPayload[] = [];

            for (const date of allDates) {
                const resolution = resolutions[date];

                // If date was a conflict and user chose 'skip'
                if (resolution?.type === 'skip') {
                    continue;
                }

                // If date was a conflict and user chose 'switch' -> use new courtId
                // If date was NOT a conflict -> use original courtId
                const targetCourtId = resolution?.type === 'switch' ? resolution.courtId : data.courtId;

                if (!targetCourtId) continue;

                bookingsToCreate.push({
                    fieldId: venue.id,
                    courtId: targetCourtId,
                    date: date,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    selectedAmenities: [], // Can be passed if needed
                    paymentMethod: 1, // Default
                    note: `Batch booking (${type}) - Resolved`,
                });
            }

            // 3. Execute Batch Booking (Sequentially or Parallel)
            if (bookingsToCreate.length === 0) {
                toast.info('Không có lịch đặt nào được tạo (đã bỏ qua tất cả).');
                setIsConflictModalOpen(false);
                return;
            }

            logger.info(`[BATCH BOOKING] Executing ${bookingsToCreate.length} bookings...`);

            // Execute all booking requests in parallel
            const promises = bookingsToCreate.map(payload =>
                dispatch(createFieldBooking(payload)).unwrap()
                    .catch(err => ({ error: err, date: payload.date })) // Catch individual errors
            );

            const results = await Promise.all(promises);

            const successfulBookings = results.filter((r: any) => !r.error && r._id);
            const failedBookings = results.filter((r: any) => r.error);

            if (successfulBookings.length > 0) {
                const totalAmount = successfulBookings.reduce((sum: number, b: any) => sum + (b.totalPrice || b.bookingAmount || 0), 0);

                toast.success(`Đã tạo thành công ${successfulBookings.length}/${bookingsToCreate.length} lịch đặt. Tổng tiền: ${formatVND(totalAmount)}`);

                // Navigate to payment with the first successful booking (conceptually treating others as 'group')
                // Ideally, we should group them into a single order/invoice, but for now we redirect to one.
                // Or verify backend support for multiple booking payment.
                // Since this is a fallback, we take the user to the Payment page of the first one.
                // !!! NOTE: PaymentV2 typically handles one booking. 
                // To support paying for ALL, we might need a "Cart" concept or Pass list of IDs.
                // Assuming Payment Page can handle lists or we just pay one by one. 
                // For MVP: Navigate to the first one.

                const firstBooking = successfulBookings[0] as any;
                const firstId = firstBooking._id;
                navigate('/payment', {
                    state: {
                        bookingId: firstId,
                        // Passing array of IDs for custom payment handling if implemented
                        allBookingIds: successfulBookings.map((b: any) => b._id),
                        fromConsecutive: true, // Reuse this flag logic
                        totalBookings: successfulBookings.length,
                        totalAmount: totalAmount,
                    }
                });
            } else {
                toast.error('Không thể tạo bất kỳ lịch đặt nào. Vui lòng thử lại.');
            }

            if (failedBookings.length > 0) {
                logger.error('[BATCH BOOKING] Some bookings failed:', failedBookings);
                // Optional: Show which dates failed
            }

            setIsConflictModalOpen(false);
            setPendingBookingContext(null);

        } catch (error: any) {
            logger.error('[BATCH BOOKING] Global error:', error);
            toast.error('Có lỗi xảy ra khi xử lý đặt sân.');
        } finally {
            setIsResolvingConflicts(false);
        }
    };

    // === Turn 1: Handler for Consecutive Days Booking ===
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

        if (!venue?.id) {
            toast.error('Không tìm thấy thông tin sân');
            return;
        }

        const startTotal = toMinutes(formData.startTime);
        const endTotal = toMinutes(formData.endTime);

        if (endTotal <= startTotal) {
            toast.error('Giờ kết thúc phải sau giờ bắt đầu');
            return;
        }

        setIsCreatingConsecutiveBooking(true);

        const payload = {
            fieldId: venue.id,
            courtId: formData.courtId,
            startDate: dateRange.start,
            endDate: dateRange.end,
            startTime: formData.startTime,
            endTime: formData.endTime,
            selectedAmenities: [],
            paymentMethod: 1,
            note: '',
        };

        try {
            const result = await dispatch(createConsecutiveDaysBooking(payload)).unwrap();

            toast.success(`Đã tạo ${result.summary.totalBookings} booking thành công! Tổng: ${formatVND(result.summary.totalAmount)}`);

            if (result.bookings && result.bookings.length > 0) {
                const firstBooking = result.bookings[0];
                navigate('/payment', {
                    state: {
                        bookingId: firstBooking._id,
                        fromConsecutive: true,
                        totalBookings: result.summary.totalBookings,
                        totalAmount: result.summary.totalAmount,
                    }
                });
            }

        } catch (error: any) {
            logger.error('[CONSECUTIVE BOOKING] Error:', error);

            // Handle conflicts -> Open Modal
            if (error.conflicts && Array.isArray(error.conflicts)) {
                setConflicts(error.conflicts);
                setPendingBookingContext({ type: 'consecutive', data: payload });
                setIsConflictModalOpen(true);
            } else {
                toast.error(error.message || 'Có lỗi xảy ra khi đặt sân liên tục');
            }
        } finally {
            setIsCreatingConsecutiveBooking(false);
        }
    };

    // === Turn 2: Handler for Weekly Recurring Booking ===
    const handleWeeklyBooking = async () => {
        if (!weeklyData.startDate || weeklyData.weekdays.length === 0) {
            toast.error('Vui lòng chọn ngày bắt đầu và các thứ trong tuần');
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

        if (!venue?.id) {
            toast.error('Không tìm thấy thông tin sân');
            return;
        }

        setIsCreatingWeeklyBooking(true);

        const payload = {
            fieldId: venue.id,
            courtId: formData.courtId,
            startDate: weeklyData.startDate,
            weekdays: weeklyData.weekdays,
            numberOfWeeks: weeklyData.numberOfWeeks,
            startTime: formData.startTime,
            endTime: formData.endTime,
        };

        try {
            await dispatch(createWeeklyRecurringBooking(payload)).unwrap();
            toast.success('Đặt sân định kỳ thành công');
            onSubmit?.(formData);
        } catch (error: any) {
            // Handle conflicts -> Open Modal
            if (error.conflicts && Array.isArray(error.conflicts)) {
                setConflicts(error.conflicts);
                setPendingBookingContext({ type: 'weekly', data: payload });
                setIsConflictModalOpen(true);
            } else {
                toast.error(error.message || 'Lỗi khi đặt sân định kỳ');
            }
        } finally {
            setIsCreatingWeeklyBooking(false);
        }
    };

    const handleSubmit = () => {
        // Validate required fields
        if (!formData.date || !formData.startTime || !formData.endTime) {
            alert('Vui lòng điền đầy đủ các trường bắt buộc');
            return;
        }

        if (!formData.courtId) {
            alert('Vui lòng chọn sân con (court)');
            return;
        }

        // Validate time range
        const startTotal = toMinutes(formData.startTime);
        const endTotal = toMinutes(formData.endTime);

        if (endTotal <= startTotal) {
            alert('Vui lòng chọn khoảng thời gian hợp lệ (giờ bắt đầu phải trước giờ kết thúc)');
            return;
        }

        // Validate slots match boundaries and constraints
        const slotDuration = venue?.slotDuration || 60;
        const numSlots = (endTotal - startTotal) / slotDuration;
        if (!Number.isInteger(numSlots)) {
            toast.warning('Thời gian đặt phải là bội số của thời gian một slot (' + slotDuration + ' phút)');
            // Optional: allow continue or return
            // return; 
        }

        onSubmit?.(formData);
    };

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 py-6">

            {/* Conflict Resolution Modal */}
            <BookingConflictModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                conflicts={conflicts}
                availableCourts={courts} // Available courts for switching
                onResolve={handleConflictResolution}
                isResolving={isResolvingConflicts}
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Booking Form */}
                <div className="md:col-span-8 space-y-6">
                    <Card className="border-none shadow-sm bg-white rounded-xl overflow-hidden">
                        <CardContent className="p-0">
                            {/* Header Section */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-blue-100">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt sân</h2>
                                        <p className="text-gray-600">Chọn thời gian và loại hình đặt sân phù hợp với bạn</p>
                                    </div>
                                    <div className="hidden md:block">
                                        {/* Status available indicator or similar */}
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-semibold text-green-600 shadow-sm border border-green-100">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            Đang mở cửa
                                        </div>
                                    </div>
                                </div>

                                {/* Booking Mode Toggle */}
                                <div className="flex flex-wrap gap-2 mt-6">
                                    <button
                                        onClick={() => setBookingMode('single')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${bookingMode === 'single'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        Đặt đơn
                                    </button>
                                    <button
                                        onClick={() => setBookingMode('consecutive')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${bookingMode === 'consecutive'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        Đặt nhiều ngày
                                    </button>
                                    <button
                                        onClick={() => setBookingMode('weekly')}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${bookingMode === 'weekly'
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        Cố định hàng tuần
                                    </button>

                                    {/* AI Toggle inside the bar */}
                                    <div className="ml-auto flex items-center gap-2">
                                        <div className={`
                                            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
                                            ${isAiMode ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-100 text-gray-600'}
                                        `}
                                            onClick={() => setIsAiMode(!isAiMode)}
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            <span className="text-sm">AI Hỗ trợ</span>
                                        </div>
                                    </div>
                                </div>

                                {isAiMode && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        <NaturalLanguageInput
                                            onParsed={handleAiParsed}
                                            fieldId={venue?.id || ''}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Court Selection */}
                                <div className="space-y-3">
                                    <Label className="text-base font-semibold text-gray-700">Chọn sân con</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {courtsError ? (
                                            <p className="text-red-500 text-sm col-span-4">{courtsError}</p>
                                        ) : (
                                            courts.map((court) => (
                                                <div
                                                    key={court.id}
                                                    onClick={() => {
                                                        const newCourtId = court.id;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            courtId: newCourtId,
                                                            courtName: court.name,
                                                        }));
                                                        // Nếu đang ở mode single và đã chọn ngày -> fetch lại availability
                                                        if (bookingMode === 'single' && formData.date && venue.id) {
                                                            fetchAvailabilityData(formData.date, newCourtId);
                                                        }
                                                    }}
                                                    className={`
                                                        p-3 rounded-lg border cursor-pointer transition-all duration-200 text-center
                                                        ${formData.courtId === court.id
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:shadow-sm'
                                                        }
                                                    `}
                                                >
                                                    <div className="font-medium">{court.name}</div>
                                                    <div className="text-xs opacity-70 mt-1">Sân tiêu chuẩn</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 my-4"></div>

                                {/* Date & Time Selection Area - Dynamic based on Mode */}
                                <div className="space-y-6">
                                    {bookingMode === 'single' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Calendar */}
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-700 mb-3 block">Chọn ngày</Label>
                                                    <div className="border rounded-lg p-3 inline-block bg-white shadow-sm">
                                                        <DatePicker
                                                            value={formData.date ? new Date(formData.date) : undefined}
                                                            onChange={(date) => {
                                                                if (date) {
                                                                    // Adjust timezone offset to get correct YYYY-MM-DD
                                                                    const offset = date.getTimezoneOffset();
                                                                    const correctedDate = new Date(date.getTime() - (offset * 60 * 1000));
                                                                    const dateStr = correctedDate.toISOString().split('T')[0];
                                                                    setFormData(prev => ({ ...prev, date: dateStr }));
                                                                    // Fetch availability when date changes
                                                                    if (venue?.id && (formData.courtId || courts[0]?.id)) {
                                                                        const targetCourtId = formData.courtId || courts[0]?.id;
                                                                        fetchAvailabilityData(dateStr, targetCourtId);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={isDateDisabled} // Use new disable logic
                                                        />
                                                    </div>
                                                </div>

                                                {/* Time Slots */}
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-700 mb-3 block">
                                                        Chọn giờ
                                                        {selectedStartTime && selectedEndTime &&
                                                            <span className="ml-2 text-blue-600 text-sm font-normal">
                                                                ({selectedStartTime} - {selectedEndTime})
                                                            </span>
                                                        }
                                                    </Label>
                                                    {isLoadingAvailability ? (
                                                        <div className="flex justify-center items-center py-10">
                                                            <Loading />
                                                        </div>
                                                    ) : availabilityError ? (
                                                        <div className="text-red-500 text-sm p-4 border border-red-100 rounded bg-red-50">
                                                            {availabilityError}
                                                        </div>
                                                    ) : !formData.date ? (
                                                        <div className="text-gray-400 italic text-sm p-4 border border-dashed rounded bg-gray-50 flex items-center gap-2">
                                                            <CalendarIcon className="h-4 w-4" /> Vui lòng chọn ngày trước
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-1">
                                                            {getAvailableTimeSlots(new Date(formData.date)).length === 0 ? (
                                                                <div className="col-span-full text-center text-gray-500 py-4">
                                                                    Không có khung giờ trống
                                                                </div>
                                                            ) : (
                                                                getAvailableTimeSlots(new Date(formData.date)).map((slotStart) => {
                                                                    const isAvailable = isSlotAvailable(slotStart);
                                                                    const isSelected = !!(
                                                                        selectedStartTime && selectedEndTime &&
                                                                        toMinutes(slotStart) >= toMinutes(selectedStartTime) &&
                                                                        toMinutes(slotStart) < toMinutes(selectedEndTime)
                                                                    );
                                                                    const isInPast = isSlotInPast(slotStart, formData.date);

                                                                    // Pretty AM/PM or just HH:mm
                                                                    const displayTime = slotStart;

                                                                    return (
                                                                        <button
                                                                            key={slotStart}
                                                                            onClick={() => isAvailable && !isInPast && handleSlotBlockClick(slotStart)}
                                                                            disabled={!isAvailable || isInPast}
                                                                            className={`
                                                                                px-2 py-2 text-sm rounded transition-all duration-200 border relative overflow-hidden
                                                                                ${isSelected
                                                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105 z-10'
                                                                                    : isAvailable && !isInPast
                                                                                        ? 'bg-white hover:border-blue-400 hover:text-blue-600 border-gray-200 text-gray-700'
                                                                                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-70'
                                                                                }
                                                                            `}
                                                                        >
                                                                            <span className="relative z-10">{displayTime}</span>
                                                                            {/* Visual indicator for unavailable */}
                                                                            {(!isAvailable || isInPast) && (
                                                                                <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
                                                                                    <div className="w-[1px] h-[150%] bg-gray-400 rotate-45 transform origin-center"></div>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {bookingMode === 'consecutive' && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                        <CalendarIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-800">Chọn khoảng ngày</h3>
                                                        <p className="text-xs text-gray-500">Đặt một khung giờ cố định cho nhiều ngày liên tiếp</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <DateRangePicker
                                                        startDate={dateRange.start}
                                                        endDate={dateRange.end}
                                                        onStartDateChange={(date) => {
                                                            setDateRange(prev => ({ ...prev, start: date }));
                                                        }}
                                                        onEndDateChange={(date) => {
                                                            setDateRange(prev => ({ ...prev, end: date }));
                                                        }}
                                                    />

                                                    {/* Time Selection for Consecutive Mode (Simplified for MVP) */}
                                                    <div className="space-y-3">
                                                        <Label className="text-sm font-medium">Khung giờ cố định</Label>
                                                        <div className="flex gap-3 items-center">
                                                            <input
                                                                type="time"
                                                                value={formData.startTime}
                                                                onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                                                                className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                            <ArrowRight className="h-4 w-4 text-gray-400" />
                                                            <input
                                                                type="time"
                                                                value={formData.endTime}
                                                                onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                                                                className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">*Khung giờ này sẽ áp dụng cho tất cả các ngày đã chọn</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {bookingMode === 'weekly' && (
                                        <div className="animate-in fade-in zoom-in-95 duration-200">
                                            <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                                        <RefreshCw className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-800">Lịch cố định hàng tuần</h3>
                                                        <p className="text-xs text-gray-500">Đặt định kỳ (ví dụ: Thứ 2, 4, 6 trong 1 tháng)</p>
                                                    </div>
                                                </div>

                                                <WeeklyPatternSelector
                                                    startDate={weeklyData.startDate}
                                                    selectedWeekdays={weeklyData.weekdays}
                                                    numberOfWeeks={weeklyData.numberOfWeeks}
                                                    onStartDateChange={(date) => setWeeklyData(p => ({ ...p, startDate: date }))}
                                                    onWeekdaysChange={(w) => setWeeklyData(p => ({ ...p, weekdays: w }))}
                                                    onNumberOfWeeksChange={(n) => setWeeklyData(p => ({ ...p, numberOfWeeks: n }))}
                                                />

                                                <div className="mt-4 pt-4 border-t border-purple-100">
                                                    <Label className="text-sm font-medium mb-2 block">Khung giờ cố định</Label>
                                                    <div className="flex gap-3 items-center max-w-md">
                                                        <input
                                                            type="time"
                                                            value={formData.startTime}
                                                            onChange={(e) => setFormData(p => ({ ...p, startTime: e.target.value }))}
                                                            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-purple-500 outline-none"
                                                        />
                                                        <ArrowRight className="h-4 w-4 text-gray-400" />
                                                        <input
                                                            type="time"
                                                            value={formData.endTime}
                                                            onChange={(e) => setFormData(p => ({ ...p, endTime: e.target.value }))}
                                                            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-purple-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Summary & Validation */}
                <div className="md:col-span-4 space-y-6">
                    <div className="sticky top-24">
                        <Card className="border shadow-lg bg-white/95 backdrop-blur-sm z-20">
                            <CardHeader className="pb-3 border-b bg-gray-50/50">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-600" />
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
                                        <span className="font-medium text-right">{formData.courtName || 'Chưa chọn'}</span>
                                    </div>

                                    {bookingMode === 'single' && (
                                        <div className="flex justify-between py-1 border-b border-dashed">
                                            <span className="text-gray-500">Ngày:</span>
                                            <span className="font-medium text-right">
                                                {formData.date ? new Date(formData.date).toLocaleDateString('vi-VN') : '---'}
                                            </span>
                                        </div>
                                    )}
                                    {bookingMode === 'consecutive' && (
                                        <div className="flex justify-between py-1 border-b border-dashed">
                                            <span className="text-gray-500">Chuỗi ngày:</span>
                                            <span className="font-medium text-right">
                                                {dateRange.start ? new Date(dateRange.start).toLocaleDateString('vi-VN') : '...'}
                                                {' -> '}
                                                {dateRange.end ? new Date(dateRange.end).toLocaleDateString('vi-VN') : '...'}
                                            </span>
                                        </div>
                                    )}
                                    {bookingMode === 'weekly' && (
                                        <div className="flex flex-col py-1 border-b border-dashed gap-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Bắt đầu:</span>
                                                <span className="font-medium">{weeklyData.startDate ? new Date(weeklyData.startDate).toLocaleDateString('vi-VN') : '---'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Thứ:</span>
                                                <span className="font-medium">{weeklyData.weekdays.length > 0 ? weeklyData.weekdays.join(', ') : '---'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Thời lượng:</span>
                                                <span className="font-medium">{weeklyData.numberOfWeeks} tuần</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1 border-b border-dashed">
                                        <span className="text-gray-500">Thời gian:</span>
                                        <span className="font-medium text-right">
                                            {formData.startTime && formData.endTime
                                                ? `${formData.startTime} - ${formData.endTime}`
                                                : '---'}
                                        </span>
                                    </div>
                                </div>

                                {/* Dynamic Price Estimate (Approximation) */}
                                <div className="mt-4 pt-4 border-t bg-gray-50 -mx-6 px-6 pb-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-600 font-medium">Tạm tính:</span>
                                        <span className="text-2xl font-bold text-blue-600">
                                            {bookingMode === 'single'
                                                ? formatVND(calculateSubtotal())
                                                : <span className="text-sm font-normal text-gray-500">(Tính sau)</span>
                                            }
                                        </span>
                                    </div>
                                    {bookingMode === 'single' && (
                                        <p className="text-xs text-right text-gray-400 mt-1">
                                            *Chưa bao gồm phí dịch vụ & tiện ích
                                        </p>
                                    )}
                                </div>

                                {bookingMode === 'single' ? (
                                    <Button
                                        className="w-full h-12 text-lg font-semibold shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        onClick={handleSubmit}
                                        disabled={!formData.date || !formData.startTime || !formData.endTime || !formData.courtId}
                                    >
                                        Tiếp tục
                                        <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                ) : bookingMode === 'consecutive' ? (
                                    <Button
                                        className="w-full h-12 text-lg font-semibold shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        onClick={handleConsecutiveBooking}
                                        disabled={isCreatingConsecutiveBooking}
                                    >
                                        {isCreatingConsecutiveBooking ? <Loading /> : 'Đặt sân nhiều ngày'}
                                    </Button>
                                ) : (
                                    <Button
                                        className="w-full h-12 text-lg font-semibold shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                        onClick={handleWeeklyBooking}
                                        disabled={isCreatingWeeklyBooking}
                                    >
                                        {isCreatingWeeklyBooking ? <Loading /> : 'Đặt sân định kỳ'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Re-export specific component for usage
export const BookCourtAiTabExport = BookCourtAiTab;
