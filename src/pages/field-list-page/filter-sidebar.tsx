import React, { useState } from "react";
import { Filter, X, DollarSign, Star, Calendar, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AMENITY_OPTIONS, RATING_OPTIONS, WEEKDAY_OPTIONS } from "@/utils/constant-value/constant";

interface FilterSidebarProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** side to open the sheet from: 'left' | 'right' */
    side?: "left" | "right";
    // Search
    searchQuery: string;
    onSearchChange: (value: string) => void;
    // Location
    locationFilter: string;
    onLocationChange: (value: string) => void;
    // Price Range
    minPrice: number | null;
    maxPrice: number | null;
    onPriceRangeChange: (min: number | null, max: number | null) => void;
    // Reviews
    minRating: number | null;
    onRatingChange: (value: number | null) => void;
    // Availability
    timeFilter: string;
    onTimeFilterChange: (value: string) => void;
    // Amenities
    selectedAmenities: string[];
    onAmenitiesChange: (amenities: string[]) => void;
    // Actions
    hasActiveFilters: boolean;
    onResetFilters: () => void;
    onSearch: () => void;
}

const CollapsibleSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, children }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-gray-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="text-sm font-medium text-gray-900">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
            </button>
            {isOpen && <div className="pb-4">{children}</div>}
        </div>
    );
};

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
    isOpen,
    onOpenChange,
    side = "right",
    searchQuery,
    onSearchChange,
    locationFilter,
    onLocationChange,
    minPrice,
    maxPrice,
    onPriceRangeChange,
    minRating,
    onRatingChange,
    timeFilter,
    onTimeFilterChange,
    selectedAmenities,
    onAmenitiesChange,
    hasActiveFilters,
    onResetFilters,
    onSearch,
}) => {
    // Location filters moved to main search bar; keep props for interface compatibility
    void locationFilter;
    void onLocationChange;
    // Search is handled in the main page; keep props for compatibility
    void searchQuery;
    void onSearchChange;

    const amenitiesOptions = AMENITY_OPTIONS;

    const handleAmenityToggle = (amenity: string) => {
        if (selectedAmenities.includes(amenity)) {
            onAmenitiesChange(selectedAmenities.filter((a) => a !== amenity));
        } else {
            onAmenitiesChange([...selectedAmenities, amenity]);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side={side} className="w-full sm:w-[450px] p-0 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-900">Bộ lọc</h2>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    {/* Advanced Search Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold">
                            <span className="text-green-600">Tìm kiếm</span>{" "}
                            <span className="text-gray-900">nâng cao</span>
                        </h3>
                        {hasActiveFilters && (
                            <button
                                onClick={onResetFilters}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Xóa tất cả
                            </button>
                        )}
                    </div>

                    {/* Search input removed; search is handled on the main page */}

                    {/* Filter Sections */}
                    <div className="space-y-0">
                        {/* Price Range (Slider) */}
                        <CollapsibleSection
                            title="Khoảng giá"
                            icon={<DollarSign className="w-4 h-4 text-gray-600" />}
                        >
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-600">Giới hạn giá</span>
                                    <span className="text-sm text-gray-900 font-medium">
                                        {maxPrice == null ? "Bất kỳ" : `${(maxPrice || 0).toLocaleString("vi-VN")} VNĐ`}
                                    </span>
                                </div>

                                {/* Custom single-thumb slider controlling max price */}
                                <div className="space-y-2">
                                    <div className="relative">
                                        {/* Track */}
                                        <div className="h-2 bg-gray-200 rounded-lg">
                                            {/* Progress fill */}
                                            <div
                                                className="h-full bg-green-600 rounded-lg"
                                                style={{ width: `${(((maxPrice ?? 1000000) as number) / 1000000) * 100}%` }}
                                            />
                                        </div>

                                        {/* Invisible native range for interaction */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={1000000}
                                            step={50000}
                                            value={maxPrice ?? 1000000}
                                            onChange={(e) => onPriceRangeChange(minPrice, Number(e.target.value))}
                                            className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
                                        />

                                        {/* Custom thumb */}
                                        <div
                                            className="absolute top-1/2 w-4 h-4 bg-green-600 border-2 border-white rounded-full shadow-lg transform -translate-y-1/2 pointer-events-none"
                                            style={{ left: `calc(${(((maxPrice ?? 1000000) as number) / 1000000) * 100}% - 8px)` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>0</span>
                                        <span>1,000,000</span>
                                    </div>
                                </div>

                                {/* Quick presets */}
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { value: 100000, label: "100K" },
                                        { value: 200000, label: "200K" },
                                        { value: 500000, label: "500K" },
                                        { value: 1000000, label: "1M+" },
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => onPriceRangeChange(minPrice, value)}
                                            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${(maxPrice ?? 1000000) === value
                                                ? "bg-green-600 text-white border-green-600"
                                                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CollapsibleSection>

                        {/* Reviews */}
                        <CollapsibleSection
                            title="Đánh giá"
                            icon={<Star className="w-4 h-4 text-gray-600" />}
                        >
                            <Select
                                value={minRating?.toString() || "0"}
                                onValueChange={(value) => onRatingChange(value === "0" ? null : Number(value))}
                            >
                                <SelectTrigger className="w-full h-10 border-gray-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RATING_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CollapsibleSection>

                        {/* Availability */}
                        <CollapsibleSection
                            title="Tình trạng"
                            icon={<Calendar className="w-4 h-4 text-gray-600" />}
                            defaultOpen={true}
                        >
                            <Select value={timeFilter} onValueChange={onTimeFilterChange}>
                                <SelectTrigger className="w-full h-10 border-gray-300">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {WEEKDAY_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CollapsibleSection>

                        {/* Amenities */}
                        <CollapsibleSection
                            title="Tiện ích"
                            icon={<CheckCircle2 className="w-4 h-4 text-gray-600" />}
                        >
                            <div className="space-y-2">
                                {amenitiesOptions.map((amenity) => (
                                    <label
                                        key={amenity}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedAmenities.includes(amenity)}
                                            onChange={() => handleAmenityToggle(amenity)}
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        />
                                        <span className="text-sm text-gray-700">{amenity}</span>
                                    </label>
                                ))}
                            </div>
                        </CollapsibleSection>
                    </div>

                    {/* Search Button */}
                    <div className="sticky bottom-0 bg-white pt-6 pb-4 border-t border-gray-200 mt-6">
                        <Button
                            onClick={onSearch}
                            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base"
                        >
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Tìm kiếm ngay
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
