export interface BookmarkCoach {
    id: string;
    name: string;
    avatar?: string | null;
    totalBookings: number;
}

export interface BookmarkCoachesResponse {
    success?: boolean;
    data: BookmarkCoach[];
}
