import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getSportDisplayNameVN } from "@/components/enums/ENUMS";
import { getPinColor, getSportWhiteIconPath } from "@/utils/fieldPinIcon";

/**
 * Get badge color for each sport type
 */
const getSportBadgeColor = (sport: string): string => {
    const colors: { [key: string]: string } = {
        'football': 'bg-blue-500',
        'tennis': 'bg-green-500',
        'badminton': 'bg-purple-500',
        'pickleball': 'bg-orange-500',
        'basketball': 'bg-red-500',
        'volleyball': 'bg-yellow-500',
        'swimming': 'bg-cyan-500',
        'gym': 'bg-gray-600',
    };
    return colors[sport.toLowerCase()] || 'bg-gray-500';
};

/**
 * Props cho CoachCard
 * @example
 * {
 *   id: "507f1f77bcf86cd799439011",
 *   name: "John Doe",
 *   location: "Hà Nội",
 *   description: "Chuyên gia cầu lông",
 *   rating: 4.8,
 *   reviews: 120,
 *   price: "200.000đ",
 *   nextAvailability: "Thứ 6, 10:00",
 *   sports: "badminton"
 * }
 */
interface CoachCardProps {
    id: string;
    name: string;
    location: string;
    description: string;
    rating: number;
    reviews: number;
    price: string;
    nextAvailability: string;
    avatarUrl?: string;
    sports?: string;
}

const CoachCard: React.FC<CoachCardProps> = ({
    id,
    name,
    location,
    description,
    rating,
    reviews,
    price,
    nextAvailability,
    avatarUrl,
    sports,
}) => {
    const navigate = useNavigate();

    /**
     * Xử lý khi click vào card
     */
    const handleCardClick = () => {
        navigate(`/coach-detail/${id}`);
    };

    const sportIconPath = sports ? getSportWhiteIconPath(sports) : null;
    const sportColor = sports ? getPinColor(sports) : '#6B7280';

    return (
        <Card
            className="w-full overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="flex">
                {/* Avatar section */}
                <div className="relative w-32 h-36 flex-shrink-0 rounded-lg overflow-hidden">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={`${name}'s avatar`}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = "https://github.com/shadcn.png";
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center rounded-lg">
                            <span className="text-3xl font-bold text-slate-500">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                {/* Content section */}
                <CardContent className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold">{name}</h3>
                                {sports && sports.trim() && (
                                    <div className="flex items-center gap-1 flex-wrap">
                                        {sports.split(',').map((sport, index) => {
                                            const trimmedSport = sport.trim();
                                            if (!trimmedSport) return null;
                                            const badgeColor = getSportBadgeColor(trimmedSport);
                                            return (
                                                <span
                                                    key={index}
                                                    className={`${badgeColor} text-white text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap`}
                                                >
                                                    Dạy môn: {getSportDisplayNameVN(trimmedSport)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <p className="text-gray-600 text-sm mb-1">{location}</p>
                        </div>
                        <div className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">{price}
                        </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2 text-left">{description}</p>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-yellow-500 text-lg">★ {rating}</span>
                            <span className="text-gray-600 text-sm ml-1">({reviews} reviews)</span>
                            <div className="flex items-center text-gray-600 text-sm ml-4">
                                <span className="mr-1">📅</span>
                                <span>Next: </span>
                                <span className="text-green-600 ml-1">{nextAvailability}</span>
                            </div>
                        </div>
                        <Button className="bg-black text-white hover:bg-gray-800">Thuê HLV</Button>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
};

export default CoachCard;