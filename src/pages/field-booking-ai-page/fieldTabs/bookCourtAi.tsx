import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Sparkles, Repeat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Field } from '@/types/field-type';
import { useLocation } from "react-router-dom";
import { useAppSelector } from '@/store/hook';
import { toast } from 'react-toastify';
import { NaturalLanguageInput } from "@/components/booking/NaturalLanguageInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingConflictModal } from "@/components/booking/BookingConflictModal";
import { ConsecutiveBookingTab } from './ConsecutiveBookingTab';
import { WeeklyBookingTab } from './WeeklyBookingTab';

/**
 * Interface for booking form data
 */
export interface BookingFormData {
    date: string;
    startTime: string;
    endTime: string;
    courtId: string;
    courtName?: string;
    name?: string;
    email?: string;
    phone?: string;
}

interface BookCourtAiTabProps {
    venue?: Field;
    onSubmit?: (payload: any) => void; // Updated to receive full booking payload
    onBack?: () => void;
    courts?: Array<{ _id: string; name: string; courtNumber?: number }>;
    courtsError?: string | null;
}

export const BookCourtAiTab: React.FC<BookCourtAiTabProps> = ({
    venue: venueProp,
    courts = [],
    onSubmit
}) => {
    const location = useLocation();
    const currentField = useAppSelector((state) => state.field.currentField);
    const venue = (venueProp || currentField || (location.state as any)?.venue) as Field | undefined;

    // === State ===
    const [bookingMode, setBookingMode] = useState<'consecutive' | 'weekly'>('consecutive');
    const [isAiMode, setIsAiMode] = useState(false);

    // Shared Form Data
    const [formData, setFormData] = useState<BookingFormData>({
        date: '',
        startTime: '',
        endTime: '',
        courtId: '',
        courtName: '',
    });

    // Consecutive Mode Specific State
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // Weekly Mode Specific State
    const [weeklyData, setWeeklyData] = useState<{ startDate: string; endDate: string; daysOfWeek: string[]; numberOfWeeks: number }>({
        startDate: '',
        endDate: '',
        daysOfWeek: [],
        numberOfWeeks: 4
    });

    // Conflict Handling State
    const [conflictData, setConflictData] = useState<{ conflicts: any[], contextData: any } | null>(null);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

    // Default select first court
    // Debug: Log courts array
    useEffect(() => {
        console.log('[BookCourtAi] Courts loaded:', courts);
    }, [courts]);

    // Auto-select first court
    useEffect(() => {
        console.log('[BookCourtAi] Auto-select check:', { courtsLength: courts.length, currentCourtId: formData.courtId });
        if (courts.length > 0 && !formData.courtId) {
            console.log('[BookCourtAi] Auto-selecting first court:', courts[0]);
            setFormData(prev => {
                // Handle both 'id' and '_id' field names
                const courtId = (courts[0] as any).id || courts[0]._id;
                const newState = {
                    ...prev,
                    courtId,
                    courtName: courts[0].name,
                };
                console.log('[BookCourtAi] New formData after auto-select:', newState);
                return newState;
            });
        }
    }, [courts]);

    // === Conflict Resolution Handler ===
    // This handler only builds the resolved payload and forwards to parent
    // The actual booking creation happens at payment step
    const handleConflictResolution = (resolutions: Record<string, { type: 'skip' | 'switch' | 'reschedule'; courtId?: string; newStartTime?: string; newEndTime?: string }>) => {
        setIsConflictModalOpen(false);
        if (!conflictData) return;

        const { contextData } = conflictData;
        const basePayload = contextData.data;
        const type = contextData.type;

        // Clone payload
        const finalPayload = { ...basePayload };

        // Collect dates to skip based on resolutions
        const skipDates = Object.entries(resolutions)
            .filter(([_, res]) => res.type === 'skip')
            .map(([date]) => date);

        if (skipDates.length > 0) {
            finalPayload.skipDates = [...(finalPayload.skipDates || []), ...skipDates];
        }

        // Collect date overrides for reschedule and switch types
        const dateOverrides: Record<string, { courtId?: string; startTime?: string; endTime?: string }> = {};
        Object.entries(resolutions).forEach(([date, res]) => {
            if (res.type === 'switch' && res.courtId) {
                dateOverrides[date] = { courtId: res.courtId };
            } else if (res.type === 'reschedule' && res.courtId && res.newStartTime && res.newEndTime) {
                dateOverrides[date] = {
                    courtId: res.courtId,
                    startTime: res.newStartTime,
                    endTime: res.newEndTime
                };
            }
        });

        if (Object.keys(dateOverrides).length > 0) {
            finalPayload.dateOverrides = dateOverrides;
        }

        // Forward the resolved payload to parent to proceed to next step
        // The actual booking creation will happen at payment step
        toast.success('Đã xử lý xung đột! Bạn có thể tiếp tục đặt sân.');
        onSubmit?.({ ...finalPayload, type });
        setConflictData(null);
    };
    if (!venue) return null;

    return (
        <div className="w-full max-w-[1320px] mx-auto px-3 flex flex-col gap-6 py-6">

            {/* Header / Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Đặt sân thông minh</h1>
                    <p className="text-gray-500">Hỗ trợ đặt lịch nhiều ngày và cố định hàng tuần</p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Chế độ AI</span>
                    <Button
                        variant={isAiMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsAiMode(!isAiMode)}
                        className={isAiMode ? "bg-purple-600 hover:bg-purple-700 text-white gap-2" : "gap-2"}
                    >
                        <Sparkles className="w-4 h-4" />
                        {isAiMode ? "Đang bật" : "Bật AI"}
                    </Button>
                </div>
            </div>

            {/* AI Input Section */}
            {isAiMode && venue && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                    <Card className="border-purple-200 bg-purple-50">
                        <CardContent className="p-4">
                            <NaturalLanguageInput
                                fieldId={venue._id || (venue as any).id}
                                onParsed={(data) => {
                                    // Map ParsedData to our state
                                    if (data.type === 'weekly') {
                                        setBookingMode('weekly');
                                        setWeeklyData({
                                            startDate: data.startDate || '',
                                            endDate: data.endDate || '',
                                            daysOfWeek: data.weekdays || [],
                                            numberOfWeeks: data.numberOfWeeks || 4
                                        });
                                    } else {
                                        setBookingMode('consecutive');
                                        setDateRange({
                                            start: data.startDate || '',
                                            end: data.endDate || ''
                                        });
                                    }
                                    setFormData(prev => ({
                                        ...prev,
                                        startTime: data.startTime || prev.startTime,
                                        endTime: data.endTime || prev.endTime,
                                    }));
                                    toast.success('Đã điền thông tin từ yêu cầu của bạn!');
                                }}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Main Tabs */}
            <Tabs value={bookingMode} onValueChange={(v) => setBookingMode(v as 'consecutive' | 'weekly')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger
                        value="consecutive"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#00775C] data-[state=active]:shadow-sm font-medium transition-all"
                    >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Đặt nhiều ngày
                    </TabsTrigger>
                    <TabsTrigger
                        value="weekly"
                        className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm font-medium transition-all"
                    >
                        <Repeat className="w-4 h-4 mr-2" />
                        Cố định hàng tuần
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="consecutive" className="mt-0 focus-visible:outline-none">
                    <ConsecutiveBookingTab
                        venue={venue}
                        courts={courts}
                        formData={formData}
                        setFormData={setFormData}
                        dateRange={dateRange}
                        setDateRange={setDateRange}
                        onConflict={(conflicts, contextData) => {
                            setConflictData({ conflicts, contextData });
                            setIsConflictModalOpen(true);
                        }}
                        onSubmit={(payload) => {
                            // Forward validated payload to parent with type
                            onSubmit?.({ ...payload, type: 'consecutive' });
                        }}
                    />
                </TabsContent>

                <TabsContent value="weekly" className="mt-0 focus-visible:outline-none">
                    <WeeklyBookingTab
                        venue={venue}
                        courts={courts}
                        formData={formData}
                        setFormData={setFormData}
                        weeklyData={weeklyData}
                        setWeeklyData={setWeeklyData}
                        onConflict={(conflicts, contextData) => {
                            setConflictData({ conflicts, contextData });
                            setIsConflictModalOpen(true);
                        }}
                        onSubmit={(payload) => {
                            // Forward validated payload to parent with type
                            onSubmit?.({ ...payload, type: 'weekly' });
                        }}
                    />
                </TabsContent>
            </Tabs>

            {/* Conflict Modal */}
            <BookingConflictModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                conflicts={conflictData?.conflicts || []}
                availableCourts={courts
                    .filter(c => {
                        const currentCourtId = conflictData?.contextData?.data?.courtId;
                        const courtId = (c as any).id || c._id;
                        return courtId !== currentCourtId;
                    })
                    .map(c => ({ _id: (c as any).id || c._id, name: c.name }))}
                onResolve={handleConflictResolution}
                fieldId={venue._id || (venue as any).id}
                courtId={conflictData?.contextData?.data?.courtId}
                originalStartTime={formData.startTime}
                originalEndTime={formData.endTime}
            />
        </div>
    );
};

export default BookCourtAiTab;
export { BookCourtAiTab as BookCourtAiTabExport };
