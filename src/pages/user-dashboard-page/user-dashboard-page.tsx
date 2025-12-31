import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Calendar,
    Wallet,
    Clock,
    Users,
    ChevronRight,
    MoreHorizontal,
    X,
    Building2,
    ArrowRight,
    FileText,
} from "lucide-react"
import { UserDashboardTabs } from "@/components/tabs/user-dashboard-tabs"
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component"
import { UserDashboardHeader } from "@/components/header/user-dashboard-header"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import { mockFavorites /* keep mockFavorites for now */ } from "@/components/mock-data/mock-data"
import { getBookmarkFields, getBookmarkCoaches } from "../../features/user/userThunk"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAppSelector, useAppDispatch } from "../../store/hook"
import { Loading } from "@/components/ui/loading"
import { getMyBookings, cancelFieldBooking, getMyInvoices, getUpcomingBooking } from "../../features/booking/bookingThunk"
import type { Booking } from "../../types/booking-type"
import logger from "../../utils/logger"

export default function UserDashboardPage() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const bookingState = useAppSelector((state) => state?.booking)
    const authUser = useAppSelector((state) => state.auth.user)
    const bookmarkFields = useAppSelector((state) => state.user.bookmarkFields)
    const bookmarkCoaches = useAppSelector((state) => (state as any).user.bookmarkCoaches)
    const bookings = bookingState?.bookings || []
    const pagination = bookingState?.pagination || null
    const loadingBookings = bookingState?.loadingBookings || false
    const loadingInvoices = bookingState?.loadingInvoices || false
    const error = bookingState?.error || null

    const [selectedTab, setSelectedTab] = useState<'court' | 'coaching' | 'combined'>('court')
    const [bookmarkTab, setBookmarkTab] = useState<'court' | 'coaching'>('court')
    // Local pagination state for invoices; data is loaded into Redux via `getMyInvoices`
    const [invoicesPage, setInvoicesPage] = useState<number>(1)
    const [invoicesLimit, setInvoicesLimit] = useState<number>(5)
    // Upcoming booking is loaded via Redux thunk `getUpcomingBooking`
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const getCourtIdFromBooking = (booking?: Booking) => {
        const court = (booking as any)?.court
        if (!court) return undefined
        return typeof court === 'string' ? court : court?._id
    }

    const handleMoreClick = (itemId: string) => {
        setOpenDropdown(openDropdown === itemId ? null : itemId)
    }

    const handleCancel = async (bookingId: string) => {
        try {
            const booking = bookings.find((b) => b._id === bookingId)
            const courtId = getCourtIdFromBooking(booking)

            await dispatch(
                cancelFieldBooking({
                    id: bookingId,
                    payload: courtId ? { courtId } : undefined,
                })
            ).unwrap()
            setOpenDropdown(null)
            // Refresh bookings after cancellation
            let typeParam: 'field' | 'coach' | 'field_coach' = 'field';
            if (selectedTab === 'coaching') typeParam = 'coach';
            else if (selectedTab === 'combined') typeParam = 'field_coach';
            dispatch(getMyBookings({ type: typeParam }))
        } catch (error) {
            logger.error('Failed to cancel booking:', error)
        }
    }

    useEffect(() => {
        let typeParam: 'field' | 'coach' | 'field_coach' = 'field';
        if (selectedTab === 'coaching') typeParam = 'coach';
        else if (selectedTab === 'combined') typeParam = 'field_coach';

        dispatch(getMyBookings({ type: typeParam }))
    }, [dispatch, selectedTab])

    // Fetch invoices via Redux thunk when pagination changes
    useEffect(() => {
        dispatch(getMyInvoices({ page: invoicesPage, limit: invoicesLimit }))
    }, [dispatch, invoicesPage, invoicesLimit])

    // Fetch upcoming booking via Redux thunk on mount
    useEffect(() => {
        dispatch(getUpcomingBooking())
    }, [dispatch])

    // Fetch bookmarks when bookmark tab changes (separate from bookings tab)
    // Only fetch if user has role 'user' to avoid permission errors
    useEffect(() => {
        if (authUser?.role !== 'user') {
            // Skip fetching bookmarks for non-user roles (field_owner, coach, etc.)
            return
        }

        if (bookmarkTab === 'court') {
            dispatch(getBookmarkFields())
        } else {
            dispatch(getBookmarkCoaches())
        }
    }, [dispatch, bookmarkTab, authUser?.role])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // Helper function to format booking data for display
    const formatBookingData = (booking: Booking) => {
        const field = typeof booking.field === 'object' ? booking.field : null
        const court = (booking as any).court
        const courtName =
            (court && typeof court === 'object' && (court as any).name)
            || (court && typeof court === 'object' && (court as any).courtNumber ? `Court ${(court as any).courtNumber}` : '')
            || (typeof court === 'string' ? court : '')
            || ''

        // Format date - handle both ISO string and date string formats
        const bookingDate = new Date(booking.date)
        const formattedDate = bookingDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        })

        // Format price with Vietnamese currency
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(booking.totalPrice || 0)

        return {
            id: booking._id,
            name: field?.name || 'Unknown Field',
            court: courtName || '—',
            date: formattedDate,
            time: `${booking.startTime} - ${booking.endTime}`,
            price: formattedPrice,
            status: booking.status,
            image: (field as any)?.images?.[0] || "-",
            color: booking.status === 'confirmed' ? 'from-green-500 to-green-600' :
                booking.status === 'pending' ? 'from-yellow-500 to-yellow-600' :
                    booking.status === 'cancelled' ? 'from-red-500 to-red-600' : 'from-gray-500 to-gray-600'
        }
    }


    // Filter bookings by type
    const filteredBookings = bookings.filter(booking => {
        if (selectedTab === 'court') {
            return booking.type === 'field'
        } else if (selectedTab === 'coaching') {
            return booking.type === 'coach'
        } else {
            return booking.type === 'field_coach'
        }
    })

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0]
    const todayBookings = bookings.filter(booking => booking.date === today && booking.status === 'confirmed')
    const nextBooking = todayBookings.length > 0 ? todayBookings[0] : null

    // Early return if bookings is not properly initialized
    if (!Array.isArray(bookings)) {
        return (
            <>
                <NavbarDarkComponent />
                <PageWrapper className="min-h-screen">
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <Loading size={40} />
                        <div className="text-muted-foreground">Đang khởi tạo...</div>
                    </div>
                </PageWrapper>
            </>
        )
    }

    return (
        <>
            <NavbarDarkComponent />
            <PageWrapper className="min-h-screen">
                <UserDashboardHeader />
                <UserDashboardTabs />

                <div className="max-w-[1320px] mx-auto py-8 space-y-8">
                    {/* Statistics Section */}
                    <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div>
                            <h2 className="text-2xl font-semibold mb-2 text-start">Thống kê</h2>
                            <p className="text-muted-foreground mb-6 text-start">Nâng cao trình độ với thống kê và mục tiêu được cá nhân hóa</p>
                        </div>
                        <div className="border-t border-gray-100 my-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <Card className="bg-gray-100 border-0 shadow-none">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-3xl font-bold text-green-600 text-start">
                                                {bookings.filter(b => b.type === 'field').length}
                                            </p>
                                            <p className="text-sm text-muted-foreground text-start">Tổng số sân đã đặt</p>
                                        </div>
                                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-100 border-0 shadow-none">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-3xl font-bold text-blue-600 text-start">
                                                {bookings.filter(b => b.type === 'coach').length}
                                            </p>
                                            <p className="text-sm text-muted-foreground text-start">Tổng số huấn luyện viên đã đặt</p>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-100 border-0 shadow-none">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-3xl font-bold text-purple-600 text-start">
                                                {bookings.filter(b => b.status === 'confirmed').length}
                                            </p>
                                            <p className="text-sm text-muted-foreground text-start">Đặt sân đã xác nhận</p>
                                        </div>
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <Clock className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-100 border-0 shadow-none">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-3xl font-bold text-emerald-600 text-start">
                                                {new Intl.NumberFormat('vi-VN', {
                                                    style: 'currency',
                                                    currency: 'VND'
                                                }).format(bookings.reduce((total, booking) => total + (booking.totalPrice || 0), 0))}
                                            </p>
                                            <p className="text-sm text-muted-foreground text-start">Tổng thanh toán</p>
                                        </div>
                                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                                            <Wallet className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Become Field Owner Promotion Card */}
                    {authUser?.role === 'user' && (
                        <Card className="bg-emerald-600 rounded-xl p-6 shadow-lg border-0 text-white">
                            <CardContent className="p-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Building2 className="w-8 h-8" />
                                            <h3 className="text-2xl font-bold">Trở thành chủ sân</h3>
                                        </div>
                                        <p className="text-green-50 mb-4 text-lg">
                                            Đăng ký làm chủ sân và bắt đầu kiếm tiền từ sân thể thao của bạn!
                                        </p>
                                        <ul className="space-y-2 mb-4 text-green-50">
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-white rounded-full"></span>
                                                Quản lý sân bóng dễ dàng
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-white rounded-full"></span>
                                                Nhận thanh toán tự động
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <span className="w-2 h-2 bg-white rounded-full"></span>
                                                Hỗ trợ 24/7 từ đội ngũ chuyên nghiệp
                                            </li>
                                        </ul>
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => navigate('/become-field-owner')}
                                                className="bg-white text-green-600 hover:bg-green-50 font-semibold"
                                            >
                                                Đăng ký ngay
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                            <Button
                                                onClick={() => navigate('/field-owner-registration-status')}
                                                variant="outline"
                                                className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold"
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Xem trạng thái
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="hidden md:block ml-8">
                                        <Building2 className="w-32 h-32 opacity-20" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Today's Appointment Section */}
                    <Card className="bg-white rounded-xl p-6 shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold mb-2 text-start">Lịch hẹn hôm nay</CardTitle>
                            <p className="text-muted-foreground text-start">Lịch trình của bạn</p>
                        </CardHeader>
                        <div className="border-t border-gray-100" />
                        <CardContent>
                            {nextBooking ? (
                                <div className="flex items-center gap-4 p-4 rounded-lg">
                                    <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                        <span className="text-white font-semibold text-sm text-start">
                                            {typeof nextBooking.field === 'object' && nextBooking.field
                                                ? nextBooking.field.name.split(' ').map(w => w[0]).join('')
                                                : 'SC'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex-1 grid grid-cols-6 gap-4 text-sm">
                                        <div className="text-start">
                                            <p className="font-medium text-start">Tên sân</p>
                                            <p className="text-muted-foreground text-start">
                                                {typeof nextBooking.field === 'object' && nextBooking.field
                                                    ? nextBooking.field.name
                                                    : 'Unknown Field'
                                                }
                                            </p>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-medium text-start">Ngày hẹn</p>
                                            <p className="text-muted-foreground text-start">
                                                {new Date(nextBooking.date).toLocaleDateString('vi-VN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-medium text-start">Giờ bắt đầu</p>
                                            <p className="text-muted-foreground text-start">{nextBooking.startTime}</p>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-medium text-start">Giờ kết thúc</p>
                                            <p className="text-muted-foreground text-start">{nextBooking.endTime}</p>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-medium text-start">Loại</p>
                                            <p className="text-muted-foreground text-start">
                                                {nextBooking.type === 'field' ? 'Sân thể thao' : 'Huấn luyện viên'}
                                            </p>
                                        </div>
                                        <div className="text-start">
                                            <p className="font-medium text-start">Trạng thái</p>
                                            <p className="text-muted-foreground text-start">{nextBooking.status}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center py-8">
                                    <div className="text-muted-foreground">Không có lịch hẹn nào hôm nay</div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* My Bookings, wallet, upcoming, bookmarks */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-3 space-y-8">
                            {/* My Bookings */}
                            <Card className="bg-white rounded-xl p-6 shadow-lg border-0">
                                <CardHeader className="flex flex-row items-center justify-between py-2">
                                    <div className="flex flex-col space-y-1">
                                        <CardTitle className="text-xl font-semibold mb-2 text-start">Lịch sử đặt sân của bạn</CardTitle>
                                        <p className="text-muted-foreground text-start">

                                            {pagination && (
                                                <span className="ml-2 text-sm">
                                                    ({pagination.total} booking{pagination.total !== 1 ? 's' : ''})
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 bg-gray-100 rounded-lg p-2">
                                        <Badge
                                            variant={selectedTab === 'court' ? 'default' : 'outline'}
                                            className={`px-4 py-2 text-sm font-medium ${selectedTab === 'court' ? 'bg-green-600' : 'border-0 bg-transparent hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer'}`}
                                            onClick={() => setSelectedTab('court')}
                                        >
                                            Sân
                                        </Badge>
                                        <Badge
                                            variant={selectedTab === 'coaching' ? 'default' : 'outline'}
                                            className={`px-4 py-2 text-sm font-medium ${selectedTab === 'coaching' ? 'bg-green-600' : 'border-0 bg-transparent hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer'}`}
                                            onClick={() => setSelectedTab('coaching')}
                                        >
                                            Huấn luyện viên
                                        </Badge>
                                        <Badge
                                            variant={selectedTab === 'combined' ? 'default' : 'outline'}
                                            className={`px-4 py-2 text-sm font-medium ${selectedTab === 'combined' ? 'bg-green-600' : 'border-0 bg-transparent hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer'}`}
                                            onClick={() => setSelectedTab('combined')}
                                        >
                                            Sân + HLV
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 text-start">
                                    <div className="border-t border-gray-100" />
                                    {loadingBookings ? (
                                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                                            <Loading size={32} />
                                            <div className="text-muted-foreground">Đang tải...</div>
                                        </div>
                                    ) : error ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="text-red-600">Lỗi: {error.message}</div>
                                        </div>
                                    ) : filteredBookings.length === 0 ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="text-muted-foreground">Chưa có booking nào</div>
                                        </div>
                                    ) : (
                                        filteredBookings.map((booking, index) => {
                                            const formattedBooking = formatBookingData(booking)
                                            return (
                                                <div key={booking._id}>
                                                    <div className="flex items-center gap-4 p-4">
                                                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                                                            <img
                                                                src={formattedBooking.image}
                                                                alt={formattedBooking.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-3 gap-4 text-sm text-start">
                                                            <div>
                                                                <p className="font-medium">{formattedBooking.name}</p>
                                                                <p className="text-muted-foreground">{formattedBooking.court}</p>
                                                                <p className="text-muted-foreground">
                                                                    Trạng thái: {formattedBooking.status}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">Date & Time</p>
                                                                <p className="text-muted-foreground">{formattedBooking.date}</p>
                                                                <p className="text-muted-foreground">{formattedBooking.time}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-lg font-bold text-green-600">{formattedBooking.price}</p>
                                                                {booking.status !== 'cancelled' && (
                                                                    <div className="relative" ref={dropdownRef}>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleMoreClick(booking._id)}
                                                                        >
                                                                            <MoreHorizontal className="w-4 h-4" />
                                                                        </Button>
                                                                        {openDropdown === booking._id && (
                                                                            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl z-10 min-w-[120px]">
                                                                                <button
                                                                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                                                                                    onClick={() => handleCancel(booking._id)}
                                                                                >
                                                                                    <X className="w-4 h-4" />
                                                                                    Cancel
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {index < filteredBookings.length - 1 && (
                                                        <div className="border-t border-gray-100 mx-4" />
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Wallet Balance */}
                            {/* <Card className="bg-emerald-700 text-white">
                                <CardContent>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <p className="text-sm opacity-90">Số dư ví của bạn</p>
                                            <p className="text-3xl font-bold">$4,544</p>
                                        </div>
                                        <Button
                                            variant="secondary"
                                            className="bg-white/20 hover:bg-white/30 text-white flex items-center justify-center gap-2"
                                        >
                                            <Wallet className="w-4 h-4" />
                                            Thêm thanh toán
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card> */}

                            {/* Upcoming Appointment */}
                            {/* <Card className="bg-white rounded-xl p-6 shadow-lg border-0">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="flex flex-col space-y-2">
                                        <CardTitle className="text-start">Lịch hẹn sắp tới</CardTitle>
                                        <p className="text-sm text-muted-foreground text-start">Quản lý tất cả các đặt sân sắp tới của bạn.</p>
                                    </div>
                                    <div className="flex gap-2 bg-gray-100 rounded-lg p-2">
                                        <Badge variant="default" className="px-4 py-2 text-sm font-medium bg-green-600">
                                            Court
                                        </Badge>
                                        <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-0 bg-transparent hover:bg-black hover:text-white transition-colors duration-200">
                                            Coaching
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="border-t border-gray-100 pt-4">
                                        {bookingState.loading ? (
                                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                                <Loading size={24} />
                                                <div className="text-muted-foreground text-xs">Đang tải lịch hẹn...</div>
                                            </div>
                                        ) : bookingState.error ? (
                                            <div className="flex items-center justify-center py-6">
                                                <div className="text-red-600">Lỗi tải lịch hẹn</div>
                                            </div>
                                        ) : bookingState.upcomingBooking ? (
                                            (() => {
                                                const ub = bookingState.upcomingBooking as any
                                                return (
                                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center">
                                                            <span className="text-white font-semibold text-xs">{(ub.fieldName || 'Sân').split(' ').map((w:string)=>w[0]).slice(0,2).join('')}</span>
                                                        </div>
                                                        <div className="flex-1 text-start">
                                                            <p className="font-medium text-sm">{ub.academyName}</p>
                                                            <p className="text-xs text-muted-foreground">{ub.fieldName}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{ub.time}</span>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                )
                                            })()
                                        ) : (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="text-muted-foreground">Không có lịch hẹn sắp tới</div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card> */}


                            {/* My Bookmarks - Only show for users with role 'user' */}
                            {authUser?.role === 'user' && (
                                <Card className="bg-white rounded-xl p-6 shadow-lg border-0">
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <div className="flex flex-col space-y-2">
                                            <CardTitle className="text-start">Bookmark của tôi</CardTitle>
                                            <p className="text-sm text-muted-foreground text-start">{bookmarkTab === 'court' ? 'Danh sách sân bookmark của tôi' : 'Danh sách huấn luyện viên bookmark của tôi'}</p>
                                        </div>
                                        <div className="flex gap-2 bg-gray-100 rounded-lg p-2">
                                            <Badge
                                                variant={bookmarkTab === 'court' ? 'default' : 'outline'}
                                                className={`px-4 py-2 text-sm font-medium ${bookmarkTab === 'court' ? 'bg-green-600' : 'border-0 bg-transparent hover:bg-black hover:text-white'}`}
                                                onClick={() => setBookmarkTab('court')}
                                            >
                                                Court
                                            </Badge>
                                            <Badge
                                                variant={bookmarkTab === 'coaching' ? 'default' : 'outline'}
                                                className={`px-4 py-2 text-sm font-medium ${bookmarkTab === 'coaching' ? 'bg-green-600' : 'border-0 bg-transparent hover:bg-black hover:text-white'}`}
                                                onClick={() => setBookmarkTab('coaching')}
                                            >
                                                Coaching
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="border-t border-gray-100 pt-4">
                                            {(() => {
                                                const items = bookmarkTab === 'court'
                                                    ? (Array.isArray(bookmarkFields) ? bookmarkFields : [])
                                                    : (Array.isArray(bookmarkCoaches) ? bookmarkCoaches : [])
                                                
                                                if (items.length === 0) {
                                                    return (
                                                        <div className="flex items-center justify-center py-8">
                                                            <div className="text-muted-foreground">
                                                                {bookmarkTab === 'court' ? 'Chưa có sân bookmark' : 'Chưa có huấn luyện viên bookmark'}
                                                            </div>
                                                        </div>
                                                    )
                                                }
                                                
                                                return items.map((favorite: any, index: number) => (
                                                    <div key={favorite.id || favorite._id || `bookmark-${index}`}>
                                                        <div className="flex items-center gap-3 p-3 rounded-lg">
                                                            {favorite.avatar ? (
                                                                <img src={favorite.avatar} alt={favorite.name} className="w-8 h-8 rounded-lg object-cover" />
                                                            ) : (
                                                                <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                                                                    <span className="text-white font-semibold text-xs">
                                                                        {(favorite.name || '').split(" ").map((w: string) => w[0]).join("")}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex-1 text-start">
                                                                <p className="font-medium text-sm">{favorite.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {favorite.totalBookings !== undefined ? `${favorite.totalBookings} bookings` : '0 bookings'}
                                                                </p>
                                                            </div>
                                                            <button onClick={() => navigate(bookmarkTab === 'court' ? `/fields/${favorite.id || favorite._id}` : `/coach/${favorite.id || favorite._id}`)}>
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                            </button>
                                                        </div>
                                                        {index < items.length - 1 && <div className="border-t border-gray-100 mx-3" />}
                                                    </div>
                                                ))
                                            })()}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Recent Invoices Section */}
                    <Card className="bg-white rounded-xl p-6 shadow-lg border-0">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-semibold mb-2 text-start">Hóa đơn gần đây</CardTitle>
                                <p className="text-muted-foreground text-start">Truy cập các hóa đơn gần đây liên quan đến đặt sân</p>
                            </div>
                            <div className="flex gap-2 bg-gray-100 rounded-lg p-2">
                                <Badge variant="default" className="px-4 py-2 text-sm font-medium bg-green-600">
                                    Court
                                </Badge>
                                <Badge variant="outline" className="px-4 py-2 text-sm font-medium border-0 bg-transparent hover:bg-black hover:text-white transition-colors duration-200">
                                    Coaching
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border-t border-gray-100 pt-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-4 px-2 font-medium text-gray-700">Tên sân</th>
                                                <th className="text-left py-4 px-2 font-medium text-gray-700">Ngày & Giờ</th>
                                                <th className="text-left py-4 px-2 font-medium text-gray-700">Thanh toán</th>
                                                <th className="text-left py-4 px-2 font-medium text-gray-700">Đã thanh toán</th>
                                                <th className="text-left py-4 px-2 font-medium text-gray-700">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingInvoices ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center">
                                                        <div className="flex flex-col items-center justify-center gap-2">
                                                            <Loading size={24} />
                                                            <div className="text-gray-500">Đang tải hóa đơn...</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : bookingState.error ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center">
                                                        <div className="text-red-600">Lỗi tải hóa đơn</div>
                                                    </td>
                                                </tr>
                                            ) : (bookingState.invoices || []).length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-8 text-center">
                                                        <div className="text-gray-500">Không có hóa đơn gần đây</div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                (bookingState.invoices || []).map((invoice: any) => {
                                                    const paidOnDate = invoice.paidOn
                                                        ? new Date(invoice.paidOn).toLocaleDateString('vi-VN')
                                                        : ''
                                                    const paidOnTime = invoice.paidOn
                                                        ? new Date(invoice.paidOn).toLocaleTimeString('vi-VN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : ''

                                                    const mapped = {
                                                        id: invoice.bookingId || invoice._id || invoice.bookingId,
                                                        name: invoice.name || invoice.fieldName || 'Unknown Field',
                                                        court: invoice.courtName
                                                            || invoice.court
                                                            || (invoice.courtNumber ? `Court ${invoice.courtNumber}` : ''),
                                                        date: invoice.date || '',
                                                        time: invoice.time || '',
                                                        image: invoice.fieldImage || invoice.image || "-",
                                                        payment: new Intl.NumberFormat('vi-VN', {
                                                            style: 'currency',
                                                            currency: 'VND',
                                                        }).format(invoice.payment ?? 0),
                                                        paidOnDate,
                                                        paidOnTime,
                                                        paid: !!invoice.paidOn,
                                                    }

                                                    return (
                                                        <tr
                                                            key={mapped.id}
                                                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <td className="py-4 px-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center">
                                                                        <img
                                                                            src={mapped.image}
                                                                            alt={mapped.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    </div>
                                                                    <div className="text-start">
                                                                        <p className="font-medium text-sm">{mapped.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {mapped.court}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <div className="text-sm">
                                                                    <div className="font-medium text-gray-900">
                                                                        {mapped.date}
                                                                    </div>
                                                                    <div className="text-gray-500">{mapped.time}</div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <span className="font-medium text-gray-900">
                                                                    {mapped.payment}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <div className="text-sm">
                                                                    <div className="text-gray-900">
                                                                        {mapped.paidOnDate || '--'}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {mapped.paidOnTime || ''}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={
                                                                        mapped.paid
                                                                            ? 'bg-green-100 text-green-700'
                                                                            : 'bg-yellow-100 text-yellow-700'
                                                                    }
                                                                >
                                                                    {mapped.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>

                        {/* Pagination controls for invoices */}
                        {bookingState.invoicesPagination && (
                            <div className="flex items-center justify-between mt-6">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">Hiển thị</span>
                                    <Select
                                        value={invoicesLimit.toString()}
                                        onValueChange={(value) => {
                                            setInvoicesLimit(parseInt(value))
                                            setInvoicesPage(1)
                                        }}
                                    >
                                        <SelectTrigger className="w-16">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-gray-600">mỗi trang</span>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="hover:bg-[#00775C] hover:text-white transition-colors bg-transparent"
                                        disabled={!bookingState.invoicesPagination.hasPrevPage}
                                        onClick={() =>
                                            setInvoicesPage((prev) => Math.max(1, prev - 1))
                                        }
                                    >
                                        &lt;
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {invoicesPage}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="hover:bg-[#00775C] hover:text-white transition-colors bg-transparent"
                                        disabled={!bookingState.invoicesPagination.hasNextPage}
                                        onClick={() =>
                                            setInvoicesPage((prev) =>
                                                Math.min(
                                                    bookingState.invoicesPagination?.totalPages || 1,
                                                    prev + 1,
                                                ),
                                            )
                                        }
                                    >
                                        &gt;
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </PageWrapper>
        </>
    )
}