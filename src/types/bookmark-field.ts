export interface BookmarkField {
    id: string;
    name: string;
    avatar?: string | null;
    totalBookings: number;
}

export interface BookmarkFieldsResponse {
    success?: boolean;
    data: BookmarkField[];
}
