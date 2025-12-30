import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

/**
 * TURN 1: Date Range Picker Component
 * 
 * USE IN: BookCourtTab component (field-booking-page/fieldTabs/bookCourt.tsx)
 */

interface DateRangePickerProps {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    disabled?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    disabled = false
}) => {
    // Auto-set min date to today
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Ngày bắt đầu
                </label>
                <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    Ngày kết thúc
                </label>
                <input
                    type="date"
                    value={endDate}
                    min={startDate || today}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    disabled={disabled || !startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
            </div>
        </div>
    );
};

/**
 * Date Preview Component - Shows all dates in range
 */
interface DatePreviewProps {
    startDate: string;
    endDate: string;
    pricePerDay: number;
}

export const DatePreview: React.FC<DatePreviewProps> = ({
    startDate,
    endDate,
    pricePerDay
}) => {
    const [dates, setDates] = useState<Date[]>([]);

    useEffect(() => {
        if (!startDate || !endDate) {
            setDates([]);
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const dateArray: Date[] = [];

        const current = new Date(start);
        while (current <= end) {
            dateArray.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }

        setDates(dateArray);
    }, [startDate, endDate]);

    if (dates.length === 0) return null;

    const totalPrice = pricePerDay * dates.length;

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 mb-2">
                📅 Các ngày sẽ đặt ({dates.length} ngày)
            </h4>

            <div className="flex flex-wrap gap-2 mb-3">
                {dates.map((date, idx) => (
                    <span
                        key={idx}
                        className="bg-white px-3 py-1 rounded border border-blue-300 text-sm"
                    >
                        {date.toLocaleDateString('vi-VN', {
                            weekday: 'short',
                            month: '2-digit',
                            day: '2-digit'
                        })}
                    </span>
                ))}
            </div>

            <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between text-sm text-blue-900">
                    <span>{dates.length} ngày × {pricePerDay.toLocaleString()}đ</span>
                    <span className="font-bold text-lg">
                        = {totalPrice.toLocaleString()}đ
                    </span>
                </div>
            </div>
        </div>
    );
};
