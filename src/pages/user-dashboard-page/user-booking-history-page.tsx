"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { UserDashboardTabs } from "@/components/tabs/user-dashboard-tabs"
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component"
import { UserDashboardHeader } from "@/components/header/user-dashboard-header"
import { PageWrapper } from "@/components/layouts/page-wrapper"
import { Loading } from "@/components/ui/loading"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAppSelector, useAppDispatch } from "../../store/hook"
import { getMyBookings, cancelFieldBooking } from "../../features/booking/bookingThunk"
import type { Booking } from "../../types/booking-type"
import BookingDetailModal from "@/components/pop-up/booking-detail-modal"
import logger from "../../utils/logger"

export default function UserBookingsPage() {
  const dispatch = useAppDispatch()
  const bookingState = useAppSelector((state) => state?.booking)
  const bookings = bookingState?.bookings || []
  const pagination = bookingState?.pagination || null
  const loadingBookings = bookingState?.loadingBookings || false
  const error = bookingState?.error || null

  const [activeTab, setActiveTab] = useState<"confirmed" | "pending" | "cancelled">("confirmed")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCourt, setFilterCourt] = useState("")
  const [viewType, setViewType] = useState("courts")
  const [timeFilter, setTimeFilter] = useState("This Week")
  const [sortBy, setSortBy] = useState("Relevance")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<{ open: boolean; action: 'cancel' | null; bookingId: string | null }>({
    open: false,
    action: null,
    bookingId: null
  })

  // Load bookings when component mounts and when filters change
  useEffect(() => {
    const params: any = {
      page: currentPage,
      limit: pageSize
    }

    // Map activeTab to API status
    if (activeTab === "pending") {
      params.status = "pending"
    } else if (activeTab === "confirmed") {
      params.status = "confirmed"
    } else if (activeTab === "cancelled") {
      params.status = "cancelled"
    }

    // Map viewType to API type
    if (viewType === "courts") {
      params.type = "field"
    } else if (viewType === "coaches") {
      params.type = "coach"
    } else if (viewType === "combined") {
      params.type = "field_coach"
    }

    dispatch(getMyBookings(params))
  }, [dispatch, activeTab, viewType, currentPage, pageSize])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "pending":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200"
      case "cancelled":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "completed":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "✓"
      case "pending":
        return "⏳"
      case "cancelled":
        return "❌"
      case "completed":
        return "✅"
      default:
        return ""
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "Đã xác nhận"
      case "pending":
        return "Chờ xác nhận"
      case "cancelled":
        return "Đã hủy"
      case "completed":
        return "Hoàn thành"
      default:
        return status
    }
  }

  // Helper function to format booking data for display
  const formatBookingData = (booking: Booking) => {
    const field = typeof booking.field === 'object' ? booking.field : null

    // Format date
    const bookingDate = new Date(booking.date)
    const formattedDate = bookingDate.toLocaleDateString('vi-VN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    // Format price with Vietnamese currency
    const formattedPrice = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(booking.totalPrice || 0)

    return {
      id: booking._id,
      courtName: field?.name || 'Unknown Field',
      courtId: field?.sportType || 'Unknown Sport',
      date: formattedDate,
      time: `${booking.startTime} - ${booking.endTime}`,
      payment: formattedPrice,
      status: booking.status,
      image: field?.images?.[0] || "/placeholder.svg"
    }
  }

  const getCourtIdFromBooking = (booking?: Booking) => {
    const court = (booking as any)?.court
    if (!court) return undefined
    return typeof court === 'string' ? court : court?._id
  }

  const handleCancelBooking = (bookingId: string) => {
    setConfirmState({ open: true, action: 'cancel', bookingId })
  }

  const handleConfirmAction = async () => {
    const { action, bookingId } = confirmState
    if (!bookingId || !action) return

    try {
      if (action === 'cancel') {
        const booking = bookings.find((b) => b._id === bookingId)
        const courtId = getCourtIdFromBooking(booking)

        await dispatch(
          cancelFieldBooking({
            id: bookingId,
            payload: courtId ? { courtId } : undefined,
          })
        ).unwrap()

        // Refresh bookings after cancellation
        dispatch(getMyBookings({
          page: currentPage,
          limit: pageSize,
          status: activeTab,
          type: viewType === "courts" ? "field" : "coach"
        }))
      }
    } catch (error) {
      logger.error('Failed to perform action:', error)
    } finally {
      setConfirmState({ open: false, action: null, bookingId: null })
    }
  }

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedBooking(null)
  }

  return (
    <>
      <NavbarDarkComponent />
      <PageWrapper className="min-h-screen">
        {/* Header Section */}
        <UserDashboardHeader />

        {/* Navigation Tabs */}
        <UserDashboardTabs />
        <div className="container mx-auto px-12 py-8">
          <div className="space-y-8">
            {/* Status Tabs and Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
              <div className="flex space-x-1">
                <Button
                  variant={activeTab === "confirmed" ? "default" : "outline"}
                  onClick={() => setActiveTab("confirmed")}
                  className={`${activeTab === "confirmed" ? "bg-black text-white hover:bg-gray-800" : "hover:bg-gray-100"
                    } transition-all duration-200`}
                >
                  Đã đặt
                </Button>
                <Button
                  variant={activeTab === "pending" ? "default" : "outline"}
                  onClick={() => setActiveTab("pending")}
                  className={`${activeTab === "pending" ? "bg-black text-white hover:bg-gray-800" : "hover:bg-gray-100"
                    } transition-all duration-200`}
                >
                  Đang chờ
                </Button>
                <Button
                  variant={activeTab === "cancelled" ? "default" : "outline"}
                  onClick={() => setActiveTab("cancelled")}
                  className={`${activeTab === "cancelled" ? "bg-black text-white hover:bg-gray-800" : "hover:bg-gray-100"
                    } transition-all duration-200`}
                >
                  Đã hủy
                </Button>
              </div>

              <div className="flex space-x-4">
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="This Week">Tuần này</SelectItem>
                    <SelectItem value="This Month">Tháng này</SelectItem>
                    <SelectItem value="Last Month">Tháng trước</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Relevance">Sắp xếp: Liên quan</SelectItem>
                    <SelectItem value="Date">Sắp xếp: Ngày</SelectItem>
                    <SelectItem value="Price">Sắp xếp: Giá</SelectItem>
                    <SelectItem value="Status">Sắp xếp: Trạng thái</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* My Bookings Section */}
            <Card className="bg-white border rounded-xl p-6 shadow-sm border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold">Đặt sân của tôi</CardTitle>
                    <p className="text-gray-600">
                      Quản lý và theo dõi tất cả các đặt sân sắp tới của bạn.
                      {pagination && (
                        <span className="ml-2 text-sm text-gray-500">
                          ({pagination.total} booking{pagination.total !== 1 ? 's' : ''})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Tìm kiếm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 hover:border-[#00775C] focus:border-[#00775C] transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Tìm kiếm"
                        value={filterCourt}
                        onChange={(e) => setFilterCourt(e.target.value)}
                        className="pl-10 w-48 hover:border-[#00775C] focus:border-[#00775C] transition-colors"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1 mt-4">
                  <Button
                    variant={viewType === "courts" ? "default" : "outline"}
                    onClick={() => setViewType("courts")}
                    className={`${viewType === "courts" ? "bg-green-600 text-white hover:bg-green-700" : "hover:bg-gray-100"
                      } transition-all duration-200`}
                  >
                    Sân
                  </Button>
                  <Button
                    variant={viewType === "coaches" ? "default" : "outline"}
                    onClick={() => setViewType("coaches")}
                    className={`${viewType === "coaches" ? "bg-green-600 text-white hover:bg-green-700" : "hover:bg-gray-100"
                      } transition-all duration-200`}
                  >
                    Huấn luyện viên
                  </Button>
                  <Button
                    variant={viewType === "combined" ? "default" : "outline"}
                    onClick={() => setViewType("combined")}
                    className={`${viewType === "combined" ? "bg-green-600 text-white hover:bg-green-700" : "hover:bg-gray-100"
                      } transition-all duration-200`}
                  >
                    Sân + HLV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Bookings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-2 font-medium text-gray-700">Tên sân</th>
                        <th className="text-left py-4 px-2 font-medium text-gray-700">Ngày & Giờ</th>
                        <th className="text-left py-4 px-2 font-medium text-gray-700">Thanh toán</th>
                        <th className="text-left py-4 px-2 font-medium text-gray-700">Trạng thái</th>
                        <th className="text-left py-4 px-2 font-medium text-gray-700">Chi tiết</th>

                        <th className="text-left py-4 px-2 font-medium text-gray-700">Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingBookings ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <Loading size={32} />
                              <div className="text-gray-500">Đang tải...</div>
                            </div>
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <div className="text-red-600">Lỗi: {error.message}</div>
                          </td>
                        </tr>
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center">
                            <div className="text-gray-500">Không có booking nào</div>
                          </td>
                        </tr>
                      ) : (
                        bookings.map((booking) => {
                          const formattedBooking = formatBookingData(booking)
                          return (
                            <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-4 px-2">
                                <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                    <img
                                      src={formattedBooking.image}
                                      alt={formattedBooking.courtName}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{formattedBooking.courtName}</div>
                                    <div className="text-sm text-gray-500">{formattedBooking.courtId}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">{formattedBooking.date}</div>
                                  <div className="text-gray-500">{formattedBooking.time}</div>
                                </div>
                              </td>
                              <td className="py-4 px-2">
                                <span className="font-medium text-gray-900">{formattedBooking.payment}</span>
                              </td>
                              <td className="py-4 px-2">
                                <Badge className={`${getStatusColor(booking.status)} transition-colors`}>
                                  {getStatusIcon(booking.status)} {getStatusText(booking.status)}
                                </Badge>
                              </td>
                              <td className="py-4 px-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(booking)}
                                  className="hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-200 bg-transparent text-blue-500 border-blue-500"
                                >
                                  👁 Xem chi tiết
                                </Button>
                              </td>

                              <td className="py-4 px-2">
                                {['pending', 'confirmed'].includes(booking.status.toLowerCase()) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-red-50 hover:text-red-600 transition-colors text-red-500"
                                    onClick={() => handleCancelBooking(booking._id)}
                                  >
                                    Hủy
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Hiển thị</span>
                      <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-gray-600">mỗi trang</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-[#00775C] hover:text-white transition-colors bg-transparent"
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        &lt;
                      </Button>
                      <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                        {pagination.page}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-[#00775C] hover:text-white transition-colors bg-transparent"
                        disabled={!pagination.hasNextPage}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        &gt;
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        booking={selectedBooking}
      />

      <AlertDialog open={confirmState.open} onOpenChange={(open) => !open && setConfirmState(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy đặt sân</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Bạn có chắc chắn muốn hủy đặt sân này không? Hành động này không thể hoàn tác.</p>
              <p className="text-sm text-yellow-600 font-medium bg-yellow-50 p-3 rounded-md border border-yellow-200">
                Lưu ý: Bạn chỉ được hoàn tiền từ chủ sân / huấn luyện viên khi hủy đặt trước 12h tính từ thời điểm bắt đầu slot bạn đặt.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Đóng</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className="bg-red-600 hover:bg-red-700 text-white">
              Xác nhận hủy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
