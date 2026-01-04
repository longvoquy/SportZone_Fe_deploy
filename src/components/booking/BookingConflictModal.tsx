import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, RefreshCw, X, Check, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeSlotPickerModal } from "./TimeSlotPickerModal";

export interface ConflictItem {
    date: string; // YYYY-MM-DD
    reason: string;
}

export interface AvailableCourt {
    _id: string;
    name: string;
}

// Map of date -> chosen resolution
// resolution type: 'skip' | 'switch' (court) | 'reschedule' (time slot)
export type ResolutionMap = Record<string, {
    type: 'skip' | 'switch' | 'reschedule',
    courtId?: string,
    newStartTime?: string,
    newEndTime?: string
}>;

interface BookingConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    conflicts: ConflictItem[];
    availableCourts: AvailableCourt[]; // Courts OTHER than the current one
    onResolve: (resolutions: ResolutionMap) => void;
    isResolving?: boolean;
    // NEW: Required for TimeSlotPickerModal
    fieldId?: string;
    courtId?: string;
    originalStartTime?: string;
    originalEndTime?: string;
}

export const BookingConflictModal: React.FC<BookingConflictModalProps> = ({
    isOpen,
    onClose,
    conflicts,
    availableCourts,
    onResolve,
    isResolving = false,
    fieldId,
    courtId,
    originalStartTime,
    originalEndTime,
}) => {
    const [resolutions, setResolutions] = useState<ResolutionMap>({});

    // State for TimeSlotPickerModal
    const [timeSlotModalOpen, setTimeSlotModalOpen] = useState(false);
    const [selectedConflictDate, setSelectedConflictDate] = useState<string | null>(null);

    // Calculate duration from original times
    const duration = React.useMemo(() => {
        if (!originalStartTime || !originalEndTime) return 60;
        const [startH, startM] = originalStartTime.split(':').map(Number);
        const [endH, endM] = originalEndTime.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
    }, [originalStartTime, originalEndTime]);

    // Initialize resolutions with default 'skip' for all conflicts
    useEffect(() => {
        if (isOpen && conflicts.length > 0) {
            const initial: ResolutionMap = {};
            conflicts.forEach(c => {
                initial[c.date] = { type: 'skip' };
            });
            setResolutions(initial);
        }
    }, [isOpen, conflicts]);

    const handleActionChange = (date: string, value: string) => {
        if (value === 'skip') {
            setResolutions(prev => ({
                ...prev,
                [date]: { type: 'skip' }
            }));
        } else if (value === 'open_time_picker') {
            // Open TimeSlotPickerModal
            setSelectedConflictDate(date);
            setTimeSlotModalOpen(true);
        } else {
            // Value is a courtId (switch court)
            setResolutions(prev => ({
                ...prev,
                [date]: { type: 'switch', courtId: value }
            }));
        }
    };

    const handleTimeSlotSelect = (startTime: string, endTime: string) => {
        if (selectedConflictDate && courtId) {
            setResolutions(prev => ({
                ...prev,
                [selectedConflictDate]: {
                    type: 'reschedule',
                    courtId: courtId,
                    newStartTime: startTime,
                    newEndTime: endTime
                }
            }));
        }
        setTimeSlotModalOpen(false);
        setSelectedConflictDate(null);
    };

    const handleConfirm = () => {
        onResolve(resolutions);
    };

    if (!isOpen) return null;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-red-600 gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Phát hiện xung đột đặt sân
                        </DialogTitle>
                        <DialogDescription>
                            Một số ngày trong lịch đặt của bạn không khả dụng. Vui lòng chọn cách xử lý cho từng ngày bên dưới.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden my-4 border rounded-md">
                        <ScrollArea className="h-[300px] p-4">
                            <div className="space-y-4">
                                {conflicts.map((conflict) => {
                                    const resolution = resolutions[conflict.date] || { type: 'skip' };
                                    const dateObj = new Date(conflict.date);
                                    const dayName = dateObj.toLocaleDateString('vi-VN', { weekday: 'long' });
                                    const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                                    return (
                                        <div key={conflict.date} className="p-4 border border-red-200 bg-red-50 rounded-lg shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                                                        <Calendar className="h-4 w-4 text-red-500" />
                                                        <span className="capitalize">{dayName}, {dateStr}</span>
                                                    </div>
                                                    <p className="text-sm text-red-600 mt-1">{conflict.reason}</p>
                                                </div>
                                                <Badge variant="destructive" className="uppercase text-[10px]">Conflict</Badge>
                                            </div>

                                            <div className="space-y-2 bg-white p-3 rounded border border-gray-100">
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="text-sm font-medium text-gray-700">Hành động:</span>

                                                    {/* Show current resolution */}
                                                    {resolution.type === 'reschedule' ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {resolution.newStartTime} - {resolution.newEndTime}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleActionChange(conflict.date, 'skip')}
                                                                className="text-gray-400 hover:text-red-500"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Select
                                                            value={
                                                                resolution.type === 'skip' ? 'skip'
                                                                    : resolution.type === 'switch' ? resolution.courtId
                                                                        : 'skip'
                                                            }
                                                            onValueChange={(val) => handleActionChange(conflict.date, val)}
                                                        >
                                                            <SelectTrigger className="w-[280px]">
                                                                <SelectValue placeholder="Chọn hành động" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="skip" className="text-red-600 font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <X className="h-4 w-4" />
                                                                        Bỏ qua ngày này
                                                                    </div>
                                                                </SelectItem>

                                                                {availableCourts.length > 0 && (
                                                                    <>
                                                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                                                            Chuyển sang sân khác
                                                                        </div>
                                                                        {availableCourts.map(court => (
                                                                            <SelectItem key={court._id} value={court._id}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <RefreshCw className="h-4 w-4 text-blue-500" />
                                                                                    {court.name}
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </>
                                                                )}

                                                                {/* Option to open time slot picker */}
                                                                {fieldId && courtId && (
                                                                    <SelectItem value="open_time_picker" className="text-green-600 font-medium">
                                                                        <div className="flex items-center gap-2">
                                                                            <Clock className="h-4 w-4" />
                                                                            Chọn khung giờ khác...
                                                                        </div>
                                                                    </SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={onClose} disabled={isResolving}>
                            Hủy đặt lịch
                        </Button>
                        <Button onClick={handleConfirm} disabled={isResolving} className="bg-indigo-600 hover:bg-indigo-700">
                            {isResolving ? (
                                <>Loading...</>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    Xác nhận xử lý
                                </div>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Time Slot Picker Modal */}
            {fieldId && courtId && selectedConflictDate && (
                <TimeSlotPickerModal
                    isOpen={timeSlotModalOpen}
                    onClose={() => {
                        setTimeSlotModalOpen(false);
                        setSelectedConflictDate(null);
                    }}
                    date={selectedConflictDate}
                    fieldId={fieldId}
                    courtId={courtId}
                    duration={duration}
                    onSelect={handleTimeSlotSelect}
                />
            )}
        </>
    );
};
