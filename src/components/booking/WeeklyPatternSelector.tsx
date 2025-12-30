import React, { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';

interface WeeklyPatternSelectorProps {
    selectedWeekdays: string[];
    numberOfWeeks: number;
    startDate: string;
    onWeekdaysChange: (weekdays: string[]) => void;
    onNumberOfWeeksChange: (weeks: number) => void;
    onStartDateChange: (date: string) => void;
}

const WEEKDAYS = [
    { value: 'monday', label: 'Thứ 2', short: 'T2' },
    { value: 'tuesday', label: 'Thứ 3', short: 'T3' },
    { value: 'wednesday', label: 'Thứ 4', short: 'T4' },
    { value: 'thursday', label: 'Thứ 5', short: 'T5' },
    { value: 'friday', label: 'Thứ 6', short: 'T6' },
    { value: 'saturday', label: 'Thứ 7', short: 'T7' },
    { value: 'sunday', label: 'Chủ nhật', short: 'CN' },
];

export const WeeklyPatternSelector: React.FC<WeeklyPatternSelectorProps> = ({
    selectedWeekdays,
    numberOfWeeks,
    startDate,
    onWeekdaysChange,
    onNumberOfWeeksChange,
    onStartDateChange,
}) => {
    const handleWeekdayToggle = (weekday: string) => {
        if (selectedWeekdays.includes(weekday)) {
            onWeekdaysChange(selectedWeekdays.filter(d => d !== weekday));
        } else {
            onWeekdaysChange([...selectedWeekdays, weekday]);
        }
    };

    // Calculate min date (today)
    const minDate = useMemo(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }, []);

    // Calculate max date (3 months from today)
    const maxDate = useMemo(() => {
        const today = new Date();
        today.setMonth(today.getMonth() + 3);
        return today.toISOString().split('T')[0];
    }, []);

    return (
        <div className="space-y-4">
            {/* Weekday Selector */}
            <div className="space-y-2.5">
                <Label className="text-base font-normal">Chọn các ngày trong tuần</Label>
                <div className="grid grid-cols-7 gap-2">
                    {WEEKDAYS.map((day) => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => handleWeekdayToggle(day.value)}
                            className={`
                                px-3 py-2 rounded-md text-sm font-medium transition-colors
                                ${selectedWeekdays.includes(day.value)
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
                            `}
                            aria-pressed={selectedWeekdays.includes(day.value)}
                        >
                            <span className="hidden sm:inline">{day.label}</span>
                            <span className="sm:hidden">{day.short}</span>
                        </button>
                    ))}
                </div>
                {selectedWeekdays.length === 0 && (
                    <p className="text-sm text-red-600">Vui lòng chọn ít nhất 1 ngày trong tuần</p>
                )}
            </div>

            {/* Number of Weeks Selector */}
            <div className="space-y-2.5">
                <Label className="text-base font-normal">Số tuần</Label>
                <input
                    type="number"
                    min={1}
                    max={12}
                    value={numberOfWeeks}
                    onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 12) {
                            onNumberOfWeeksChange(value);
                        }
                    }}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Nhập số tuần (1-12)"
                />
                <p className="text-sm text-gray-500">Tối đa 12 tuần</p>
            </div>

            {/* Start Date Selector */}
            <div className="space-y-2.5">
                <Label className="text-base font-normal">Ngày bắt đầu (tuần đầu tiên)</Label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    min={minDate}
                    max={maxDate}
                    className="w-full h-12 border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-sm text-gray-500">
                    Chọn ngày đầu tuần để bắt đầu pattern
                </p>
            </div>

            {/* Preview Summary */}
            {selectedWeekdays.length > 0 && numberOfWeeks > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                        📅 Pattern: Mỗi{' '}
                        {selectedWeekdays.map(day =>
                            WEEKDAYS.find(d => d.value === day)?.label
                        ).join(', ')}{' '}
                        trong {numberOfWeeks} tuần
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                        ≈ {selectedWeekdays.length * numberOfWeeks} ngày sẽ được đặt
                    </p>
                </div>
            )}
        </div>
    );
};

export default WeeklyPatternSelector;
