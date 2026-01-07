import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Booking {
    id: string;
    academyName: string;
    courtName?: string;
    courtNumber?: number;
    academyImage: string;
    date: string;
    time: string;
    payment: string;
    status: "awaiting" | "accepted" | "rejected" | "completed";
    statusText: string;
    transactionStatus?: string;
    approvalStatus?: string;
}

interface BookingTableProps {
    bookings: Booking[];
    onViewDetails: (bookingId: string) => void;
    onAccept?: (bookingId: string) => void;
    onDeny?: (bookingId: string) => void;
    onCancel?: (bookingId: string) => void;
}

const getStatusBadgeStyles = (status: Booking["status"]) => {
    switch (status) {
        case "awaiting":
            return "bg-violet-100 text-violet-600 hover:bg-violet-200";
        case "accepted":
        case "completed":
            return "bg-green-100 text-green-600 hover:bg-green-200";
        case "rejected":
            return "bg-red-100 text-red-600 hover:bg-red-200";
        default:
            return "";
    }
};

const convertTo24Hour = (time12h: string): string => {
    // Format: "03:00 PM - 05:00 PM" -> "15:00 - 17:00"
    const parts = time12h.split(" - ");
    if (parts.length !== 2) return time12h;

    const convertSingleTime = (timeStr: string): string => {
        const trimmed = timeStr.trim();
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) return trimmed;

        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const period = timeMatch[3].toUpperCase();

        if (period === "PM" && hours !== 12) {
            hours += 12;
        } else if (period === "AM" && hours === 12) {
            hours = 0;
        }

        return `${hours.toString().padStart(2, "0")}:${minutes}`;
    };

    return `${convertSingleTime(parts[0])} - ${convertSingleTime(parts[1])}`;
};

export function BookingTable({
    bookings,
    onViewDetails,
    onAccept,
    onDeny,
    onCancel,
}: BookingTableProps) {
    return (
        <div className="w-full bg-white">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 border-b">
                            <TableHead className="w-80 font-semibold text-gray-900 text-left py-4">
                                Tên Sân
                            </TableHead>
                            <TableHead className="w-48 font-semibold text-gray-900 text-left py-4">
                                Sân con
                            </TableHead>
                            <TableHead className="w-96 font-semibold text-gray-900 text-left py-4">
                                Ngày & Giờ
                            </TableHead>
                            <TableHead className="w-32 text-left font-semibold text-gray-900 py-4">
                                Thanh Toán
                            </TableHead>
                            <TableHead className="w-32 font-semibold text-gray-900 text-left py-4">
                                Trạng Thái
                            </TableHead>
                            <TableHead className="w-36 font-semibold text-gray-900 text-left py-4">
                                Chi Tiết
                            </TableHead>
                            <TableHead className="w-48 py-4">Hành Động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bookings.map((booking) => (
                            <TableRow key={booking.id} className="border-b hover:bg-gray-50">
                                <TableCell className="py-2 text-left">
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <span className="text-base font-medium text-gray-900 text-left">
                                            {booking.academyName}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5 text-left">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm text-gray-900 text-left">
                                            {booking.date}
                                        </span>
                                        <span className="text-sm text-gray-900 pt-1 text-left">
                                            {convertTo24Hour(booking.time)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3.5 text-left">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm text-gray-900 text-left">
                                            {booking.courtName || (booking.courtNumber ? `Court ${booking.courtNumber}` : '—')}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 text-left">
                                    <span className="text-base font-medium text-gray-900">
                                        {booking.payment}
                                    </span>
                                </TableCell>
                                <TableCell className="py-5 text-left">
                                    <Badge
                                        variant="secondary"
                                        className={`${getStatusBadgeStyles(booking.status)} rounded-sm`}
                                    >
                                        {booking.statusText}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-6 text-left">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 p-0 h-auto font-normal"
                                        onClick={() => onViewDetails(booking.id)}
                                    >
                                        Xem Chi Tiết
                                    </Button>
                                </TableCell>

                                <TableCell className="py-5 text-left">
                                    {/* Show Accept/Reject for pending approval OR pending/processing transactions */}
                                    {booking.status === "awaiting" ? (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="default"
                                                className="bg-green-600 hover:bg-green-700 text-white h-8"
                                                onClick={() => onAccept && onAccept(booking.id)}
                                            >
                                                Chấp Nhận
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="default"
                                                className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                                onClick={() => onDeny && onDeny(booking.id)}
                                            >
                                                Từ Chối
                                            </Button>
                                        </div>
                                    ) : (booking.status === "accepted") ? (
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="h-8 bg-red-600 hover:bg-red-700 text-white"
                                            onClick={() => onCancel && onCancel(booking.id)}
                                        >
                                            Hủy Đặt
                                        </Button>
                                    ) : (
                                        <div className="text-sm text-gray-500">Không có hành động</div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}