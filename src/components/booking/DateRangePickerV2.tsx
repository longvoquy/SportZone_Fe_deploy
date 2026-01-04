'use client'

import { useState } from 'react'
import { formatDateRange } from 'little-date'
import { ChevronDownIcon } from 'lucide-react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DateRangePickerV2Props {
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    disabled?: (date: Date) => boolean;
    label?: string;
}

export const DateRangePickerV2: React.FC<DateRangePickerV2Props> = ({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    disabled,
    label = 'Chọn khoảng ngày'
}) => {
    const [range, setRange] = useState<DateRange | undefined>(() => {
        if (startDate && endDate) {
            return {
                from: new Date(startDate),
                to: new Date(endDate)
            };
        }
        return undefined;
    });

    const handleSelect = (selectedRange: DateRange | undefined) => {
        setRange(selectedRange);
        if (selectedRange?.from) {
            const offset = selectedRange.from.getTimezoneOffset();
            const correctedDate = new Date(selectedRange.from.getTime() - (offset * 60 * 1000));
            const dateStr = correctedDate.toISOString().split('T')[0];
            onStartDateChange(dateStr);
        }
        if (selectedRange?.to) {
            const offset = selectedRange.to.getTimezoneOffset();
            const correctedDate = new Date(selectedRange.to.getTime() - (offset * 60 * 1000));
            const dateStr = correctedDate.toISOString().split('T')[0];
            onEndDateChange(dateStr);
        } else if (selectedRange?.from && !selectedRange?.to) {
            // If only start date is selected, clear end date
            onEndDateChange('');
        }
    };

    return (
        <div className='w-full space-y-2'>
            <Label htmlFor='date-range' className='px-1 text-base font-semibold text-gray-700'>
                {label}
            </Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant='outline'
                        id='date-range'
                        className='w-full justify-between font-normal h-12 border-gray-300 hover:border-[#00775C] hover:bg-green-50'
                    >
                        {range?.from && range?.to
                            ? formatDateRange(range.from, range.to, {
                                includeTime: false
                            })
                            : startDate && endDate
                                ? `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`
                                : 'Chọn khoảng ngày'}
                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className='w-auto overflow-hidden p-0 bg-white' align='start'>
                    <Calendar
                        mode='range'
                        selected={range}
                        onSelect={handleSelect}
                        disabled={disabled}
                        classNames={{
                            today: 'text-foreground' // Remove yellow background, keep only text styling
                        }}
                        modifiersStyles={{
                            disabled: {
                                backgroundColor: '#f3f4f6',
                                color: '#9ca3af',
                                opacity: 0.5,
                                cursor: 'not-allowed',
                                textDecoration: 'line-through'
                            }
                        }}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
