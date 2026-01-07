import { CalendarIcon, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BookingFiltersProps {
    onSearch?: (value: string) => void;
    onTimeFilterChange?: (value: string) => void;
    onSortChange?: (value: string) => void;
}

export function BookingFilters({
    onSearch,
    onTimeFilterChange,
    onSortChange,
}: BookingFiltersProps) {
    return (
        <div className="w-full bg-gray-50 rounded-md p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Left side - Time filter and Sort */}
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2.5">
                        <span className="text-gray-600 text-base">Sắp Xếp</span>
                        <Select defaultValue="relevance" onValueChange={onSortChange}>
                            <SelectTrigger className="w-40 bg-white border-gray-200 rounded-md">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="relevance">Liên Quan</SelectItem>
                                <SelectItem value="date-desc">Mới Nhất</SelectItem>
                                <SelectItem value="date-asc">Cũ Nhất</SelectItem>
                                <SelectItem value="price-desc">Giá Cao</SelectItem>
                                <SelectItem value="price-asc">Giá Thấp</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-1">
                        <Select defaultValue="this-week" onValueChange={onTimeFilterChange}>
                            <SelectTrigger className="w-36 bg-white border-gray-200 rounded-md">
                                <div className="flex items-center gap-3.5">
                                    <CalendarIcon className="h-[14px] w-[14px] text-gray-600" />
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this-week">Tuần Này</SelectItem>
                                <SelectItem value="this-month">Tháng Này</SelectItem>
                                <SelectItem value="last-month">Tháng Trước</SelectItem>
                                <SelectItem value="all">Tất Cả</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right side - Search */}
                <div className="flex items-center gap-3.5">
                    <div className="relative w-64">
                        <Input
                            placeholder="Tìm Kiếm"
                            className="bg-gray-100 border-0 pr-10"
                            onChange={(e) => onSearch?.(e.target.value)}
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-900" />
                    </div>
                </div>
            </div>
        </div>
    );
}