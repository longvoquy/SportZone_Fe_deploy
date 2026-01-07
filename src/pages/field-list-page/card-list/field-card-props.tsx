import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import { getFieldStatsThunk, selectFieldStats } from "@/features/reviews";
import { getFieldById } from "@/features/field/fieldThunk";
import { getSportDisplayNameVN } from "@/components/enums/ENUMS";
import { getPinColor, getSportWhiteIconPath } from "@/utils/fieldPinIcon";
import { MapPin, Clock } from "lucide-react";
interface OperatingHours {
    day: string; // monday, tuesday, wednesday, etc.
    start: string; // HH:mm format (24-hour)
    end: string; // HH:mm format (24-hour)
    duration: number; // slot duration in minutes
}

interface FieldCardProps {
    id?: string;
    name: string;
    location: string;
    description: string;
    rating: number;
    reviews: number;
    price: string;
    nextAvailability: string;
    sportType: string;
    imageUrl: string;
    distance?: string;
    operatingHours?: OperatingHours[];
    onBookNow?: () => void; // Callback to sync filters before navigation
}

/**
 * Format operating hours for display
 * If all days have the same hours, show "05:00 - 22:00"
 * Otherwise, show today's hours or the most common hours
 */
const formatOperatingHours = (operatingHours?: OperatingHours[]): string | null => {
    if (!operatingHours || operatingHours.length === 0) {
        return null;
    }

    // Check if all days have the same hours
    const firstHours = operatingHours[0];
    const allSame = operatingHours.every(oh =>
        oh.start === firstHours.start && oh.end === firstHours.end
    );

    if (allSame) {
        return `${firstHours.start} - ${firstHours.end}`;
    }

    // If different, show today's hours
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date().getDay();
    const todayName = dayNames[today];
    const todayHours = operatingHours.find(oh => oh.day === todayName);

    if (todayHours) {
        return `${todayHours.start} - ${todayHours.end}`;
    }

    // Fallback: show first available hours
    return `${operatingHours[0].start} - ${operatingHours[0].end}`;
};

const FieldCard: React.FC<FieldCardProps> = ({
    id,
    name,
    location,
    description,
    rating,
    reviews,
    price,
    nextAvailability,
    sportType,
    imageUrl,
    distance,
    operatingHours,
    onBookNow,
}) => {
    // Unused props reserved for future UI
    void description;
    void nextAvailability;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const stats = useAppSelector((s) => (id ? selectFieldStats(s, String(id)) : null));

    const displayRating = typeof stats?.averageRating === 'number' ? stats!.averageRating : rating;
    const displayReviews = typeof stats?.totalReviews === 'number' ? stats!.totalReviews : reviews;

    useEffect(() => {
        if (!id) return;
        // fetch stats if we don't have them yet (null means stale or not present)
        if (stats === null || typeof stats === 'undefined') {
            dispatch(getFieldStatsThunk(String(id)));
        }
    }, [id, stats, dispatch]);

    const handleBooking = async () => {
        if (!id) return;

        // Call onBookNow callback to sync filters before navigation
        if (onBookNow) {
            onBookNow();
        }

        try {
            await dispatch(getFieldById(id));
        } finally {
            navigate(`/fields/${id}`);
        }
    };

    const sportIconPath = getSportWhiteIconPath(sportType);
    const sportColor = getPinColor(sportType);
    const formattedHours = formatOperatingHours(operatingHours);
    return (
        <Card className="w-full overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow">
            <div className="flex flex-col sm:flex-row">
                {/* Image section */}
                <div className="relative w-full h-48 sm:w-32 sm:h-40 flex-shrink-0 sm:rounded-l-lg sm:rounded-tr-none overflow-hidden">
                    <img
                        src={imageUrl}
                        alt={`${name} field`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // Fallback image nếu không load được
                            (e.target as HTMLImageElement).src = "/images/1.1.png";
                        }}
                    />
                    <div
                        className="absolute top-2 left-2 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: sportColor }}
                    >
                        {sportIconPath && (
                            <img
                                src={sportIconPath}
                                alt={sportType}
                                className="w-4 h-4"
                            />
                        )}
                        {getSportDisplayNameVN(sportType)}
                    </div>
                </div>

                {/* Content section */}
                <CardContent className="p-4 flex-1 flex flex-col sm:flex-row text-start gap-4">
                    {/* Left Column: All Information */}
                    <div className="flex-1 min-w-0">
                        <div className="mb-2">
                            <h3 className="text-xl font-bold mb-1 break-words">{name}</h3>
                            <p className="text-gray-600 text-sm mb-1 flex items-start gap-1 break-words">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                                {location}
                            </p>
                            {formattedHours && (
                                <p className="text-gray-600 text-sm mb-1 flex items-center gap-1">
                                    <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                                    {formattedHours}
                                </p>
                            )}
                            {distance && (
                                <p className="text-green-600 text-xs font-medium flex items-center gap-1 mt-1">
                                    📍 {distance} từ vị trí của bạn
                                </p>
                            )}
                        </div>

                        <div className="flex items-center mt-3">
                            {displayRating > 0 ? (
                                <>
                                    <span className="text-yellow-500 text-lg">★ {displayRating.toFixed(1)}</span>
                                    <span className="text-gray-600 text-sm ml-1">({displayReviews} reviews)</span>
                                </>
                            ) : (
                                <span className="text-gray-500 text-sm">Chưa có đánh giá</span>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Price and Action Button */}
                    <div className="flex sm:flex-col justify-between items-center sm:items-end flex-shrink-0 min-w-[120px] gap-2">
                        <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap">
                            {price}
                        </div>

                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                            <Button
                                onClick={handleBooking}
                                className="bg-green-600 text-white hover:bg-green-700 w-full sm:w-28 text-sm px-4"
                            >
                                Đặt ngay
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
};

export default FieldCard;