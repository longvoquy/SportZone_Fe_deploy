import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getSportDisplayNameVN } from "@/components/enums/ENUMS";

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

    return (
        <Card
            className="w-full overflow-hidden shadow-lg rounded-lg hover:shadow-xl transition-shadow cursor-pointer"
            onClick={handleCardClick}
        >
            <div className="flex flex-col sm:flex-row h-full">
                {/* Avatar section */}
                <div className="relative w-full h-48 sm:w-32 sm:h-auto flex-shrink-0 sm:rounded-l-lg sm:rounded-tr-none overflow-hidden">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={`${name}'s avatar`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = "https://github.com/shadcn.png";
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center sm:rounded-l-lg">
                            <span className="text-3xl font-bold text-slate-500">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                {/* Content section */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                            <div className="flex-1 w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
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
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                        <div className="flex items-center w-full sm:w-auto">
                            <span className="text-yellow-500 text-lg">★ {rating}</span>
                            <span className="text-gray-600 text-sm ml-1">({reviews} reviews)</span>
                            <div className="flex items-center text-gray-600 text-sm ml-4">
                                <span className="mr-1">📅</span>
                                <span className="hidden sm:inline">Next: </span>
                                <span className="text-green-600 ml-1">{nextAvailability}</span>
                            </div>
                        </div>
                        <Button className="w-full sm:w-auto bg-black text-white hover:bg-gray-800">Thuê HLV</Button>
                    </div>
                </CardContent>
            </div>
        </Card>
    );
};

export default CoachCard;