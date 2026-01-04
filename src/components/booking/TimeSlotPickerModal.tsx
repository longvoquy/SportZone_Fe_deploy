import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import axiosPublic from '@/utils/axios/axiosPublic';

interface TimeSlot {
    startTime: string;
    endTime: string;
    status: 'available' | 'booked' | 'blocked' | 'past';
    reason?: string;
}

interface TimeSlotPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: string; // YYYY-MM-DD
    fieldId: string;
    courtId: string;
    duration: number; // in minutes
    onSelect: (startTime: string, endTime: string) => void;
}

export const TimeSlotPickerModal: React.FC<TimeSlotPickerModalProps> = ({
    isOpen,
    onClose,
    date,
    fieldId,
    courtId,
    duration,
    onSelect
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slots, setSlots] = useState<TimeSlot[]>([]);

    const [slotDuration, setSlotDuration] = useState<number>(60);
    const [requiredSlots, setRequiredSlots] = useState<number>(2);
    const [selectedStartSlot, setSelectedStartSlot] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Fetch schedule when modal opens
    useEffect(() => {
        if (isOpen && fieldId && courtId && date && duration > 0) {
            fetchSchedule();
        }
    }, [isOpen, fieldId, courtId, date, duration]);

    const fetchSchedule = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosPublic.get('/bookings/conflict-date-schedule', {
                params: { fieldId, courtId, date, duration }
            });
            // Handle wrapped response: {success: true, data: {...}}
            const responseData = response.data?.data || response.data;
            console.log('[TimeSlotPickerModal] Parsed responseData:', responseData);
            setSlots(responseData.allSlots || []);

            setSlotDuration(responseData.slotDuration || 60);
            setRequiredSlots(responseData.requiredSlots || Math.ceil(duration / (responseData.slotDuration || 60)));
            setSelectedStartSlot(null); // Reset selection when fetching new data
            setErrorMessage(null); // Reset error message
        } catch (err: any) {
            console.error('[TimeSlotPickerModal] Error fetching schedule:', err);
            setError(err.response?.data?.message || 'Failed to load schedule');
        } finally {
            setLoading(false);
        }
    };

    const getSlotEndTime = (startTime: string): string => {
        const [hours, minutes] = startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + slotDuration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMins = totalMinutes % 60;
        return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
    };

    const handleSlotClick = (index: number) => {
        const slot = slots[index];
        if (slot.status !== 'available') return;

        // Check if we CAN select (for validation UI)
        let canSelect = true;
        for (let i = 0; i < requiredSlots; i++) {
            if (index + i >= slots.length || slots[index + i].status !== 'available') {
                canSelect = false;
                break;
            }
        }

        setSelectedStartSlot(index);

        if (canSelect) {
            setErrorMessage(null);
        } else {
            // Not enough consecutive slots: show error
            const missingSlots: number[] = [];
            for (let i = 0; i < requiredSlots; i++) {
                if (index + i >= slots.length || slots[index + i].status !== 'available') {
                    missingSlots.push(index + i);
                }
            }

            if (missingSlots.length > 0) {
                const firstMissing = missingSlots[0];
                const missingSlot = slots[firstMissing];
                if (missingSlot) {
                    setErrorMessage(`Cần ${requiredSlots} slot liên tiếp. Slot ${missingSlot.startTime}-${missingSlot.endTime} không khả dụng.`);
                } else {
                    setErrorMessage(`Cần ${requiredSlots} slot liên tiếp nhưng không đủ slot.`);
                }
            }
        }
    };

    const handleConfirm = () => {
        if (selectedStartSlot === null) return;

        // Verify the selection is still valid
        let isValid = true;
        for (let i = 0; i < requiredSlots; i++) {
            if (selectedStartSlot + i >= slots.length || slots[selectedStartSlot + i].status !== 'available') {
                isValid = false;
                break;
            }
        }

        if (isValid) {
            const startSlot = slots[selectedStartSlot];
            const endSlot = slots[selectedStartSlot + requiredSlots - 1];
            const startTime = startSlot.startTime;
            const endTime = getSlotEndTime(endSlot.startTime);
            onSelect(startTime, endTime);
            onClose();
        } else {
            setErrorMessage("Lựa chọn hiện tại không hợp lệ.");
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };



    if (!isOpen) return null;

    // derived state for confirm button
    let isSelectionValid = false;
    if (selectedStartSlot !== null) {
        isSelectionValid = true;
        for (let i = 0; i < requiredSlots; i++) {
            if (selectedStartSlot + i >= slots.length || slots[selectedStartSlot + i].status !== 'available') {
                isSelectionValid = false;
                break;
            }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        Chọn khung giờ khác
                    </DialogTitle>
                    <DialogDescription>
                        {formatDate(date)} - Thời lượng: {duration} phút
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden py-4">
                    {/* Legend */}
                    <div className="flex items-center gap-4 flex-wrap text-xs mb-4 px-1">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-white border-2 border-green-400 rounded"></div>
                            <span>Trống</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-100 border-2 border-red-300 rounded"></div>
                            <span>Đã đặt</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-orange-100 border-2 border-orange-300 rounded"></div>
                            <span>Bị khóa</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-gray-100 border-2 border-gray-300 rounded"></div>
                            <span>Đã qua</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                            <span className="ml-2 text-gray-600">Đang tải lịch...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            <p>{error}</p>
                            <Button variant="outline" onClick={fetchSchedule} className="mt-3">
                                Thử lại
                            </Button>
                        </div>
                    ) : slots.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Không có khung giờ nào khả dụng trong ngày này</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-sm text-gray-600">
                                Chọn {requiredSlots} slot liên tiếp (mỗi slot {slotDuration} phút)
                            </div>
                            <ScrollArea className="h-[300px] pr-2" horizontal>
                                <div className="min-w-full w-max">
                                    {/* Time Header Row */}
                                    <div className="flex border-b-2 border-gray-300 bg-blue-50 relative pt-6">
                                        <div className="w-24 shrink-0 border-r-2 border-gray-300 p-2 text-xs font-semibold text-center">
                                            Giờ
                                        </div>
                                        <div className="flex flex-1 relative">
                                            {slots.length > 0 && (
                                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-400 z-10">
                                                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap bg-blue-50 px-1">
                                                        {slots[0].startTime}
                                                    </div>
                                                </div>
                                            )}
                                            {slots.map((slot, index) => {
                                                const displayText = slot.endTime;
                                                return (
                                                    <div
                                                        key={`header-${index}`}
                                                        className="flex-1 min-w-[60px] relative"
                                                    >
                                                        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-gray-400 z-10">
                                                            <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap bg-blue-50 px-1">
                                                                {displayText}
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
                                            Slot
                                        </div>
                                        <div className="flex flex-1">
                                            {slots.map((slot, index) => {
                                                const isSelected = selectedStartSlot !== null &&
                                                    index >= selectedStartSlot &&
                                                    index < selectedStartSlot + requiredSlots;
                                                const isStartSlot = index === selectedStartSlot;
                                                const isEndSlot = selectedStartSlot !== null && index === selectedStartSlot + requiredSlots - 1;


                                                let cellStyle = "bg-white border-r border-gray-200 cursor-pointer hover:bg-emerald-50 transition-colors";
                                                if (slot.status === 'booked') {
                                                    cellStyle = "bg-red-100 border-r border-gray-200 cursor-not-allowed text-red-600";
                                                } else if (slot.status === 'blocked') {
                                                    cellStyle = "bg-orange-100 border-r border-gray-200 cursor-not-allowed text-orange-600";
                                                } else if (slot.status === 'past') {
                                                    cellStyle = "bg-gray-100 border-r border-gray-200 cursor-not-allowed text-gray-400";
                                                } else if (isSelected) {
                                                    if (isStartSlot || isEndSlot) {
                                                        cellStyle = "bg-emerald-600 border-r border-gray-200 cursor-pointer text-white font-semibold";
                                                    } else {
                                                        cellStyle = "bg-emerald-400 border-r border-gray-200 cursor-pointer text-white";
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={`slot-${index}`}
                                                        className={cn(
                                                            "flex-1 min-w-[60px] h-12 flex items-center justify-center text-xs relative",
                                                            cellStyle
                                                        )}
                                                        onClick={() => handleSlotClick(index)}
                                                        title={slot.reason || `${slot.startTime} - ${slot.endTime}`}
                                                    >
                                                        {isStartSlot && "Bắt đầu"}
                                                        {isEndSlot && !isStartSlot && "Kết thúc"}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            {selectedStartSlot !== null && (
                                <div className="mt-2 space-y-1">
                                    {(() => {
                                        // Check if selection is valid (all required slots are available)
                                        let isValid = true;
                                        for (let i = 0; i < requiredSlots; i++) {
                                            if (selectedStartSlot + i >= slots.length || slots[selectedStartSlot + i].status !== 'available') {
                                                isValid = false;
                                                break;
                                            }
                                        }

                                        if (isValid) {
                                            return (
                                                <div className="text-sm text-emerald-600 font-semibold">
                                                    Đã chọn: {slots[selectedStartSlot]?.startTime} - {getSlotEndTime(slots[selectedStartSlot + requiredSlots - 1]?.startTime)}
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className="text-sm text-red-600">
                                                    {errorMessage || `Không đủ ${requiredSlots} slot liên tiếp từ slot này.`}
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isSelectionValid}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Xác nhận
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TimeSlotPickerModal;
