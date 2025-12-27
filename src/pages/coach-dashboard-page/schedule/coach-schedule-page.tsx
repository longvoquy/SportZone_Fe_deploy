import { useEffect, useState } from "react"
import axiosPublic from "@/utils/axios/axiosPublic"
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Booking } from "@/types/booking-type"
import { CoachDashboardLayout } from "@/components/layouts/coach-dashboard-layout"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import logger from "@/utils/logger"

export default function CoachSchedulePage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [_userId, setUserId] = useState<string | null>(null)
  const [_coachId, setCoachId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const hourHeight = 45
  const firstHour = 5 // 5 AM

  useEffect(() => {
    const loadUserAndFetchData = async () => {
      try {
        const storedUser = sessionStorage.getItem("user")
        if (!storedUser) return

        const user = JSON.parse(storedUser)
        const id = user._id
        if (!id) return

        setUserId(id)

        const response = await axiosPublic.get(`/profiles/coach-id/${id}`)
        const coachId = response.data?.data?.id
        setCoachId(coachId)

        if (coachId) {
          const bookingRes = await axiosPublic.get(`/bookings/coach/${coachId}`)
          const allBookings: Booking[] = bookingRes.data?.data || []
          const accepted = allBookings.filter((b) => b.coachStatus === "accepted")
          setBookings(accepted)
        }
      } catch (err) {
        logger.error("[loadUserAndFetchData] Failed to fetch coach data:", err)
      }
    }

    loadUserAndFetchData()
  }, [])
  const bookingUser =
    selectedBooking?.user !== null &&
      typeof selectedBooking?.user === "object"
      ? selectedBooking.user
      : null
  // --- Navigation ---
  const handlePrevWeek = () => setCurrentDate((d) => subWeeks(d, 1))
  const handleNextWeek = () => setCurrentDate((d) => addWeeks(d, 1))

  const days = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })
  const hours = Array.from({ length: 17 }, (_, i) => i + firstHour)
  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(new Date(b.date), day))

  const getShortLocation = (
    location?: string | { address?: string }
  ) => {
    if (!location) return "No location";

    if (typeof location === "string") {
      return location.split(",").slice(0, 2).join(",");
    }

    if (typeof location === "object" && location.address) {
      return location.address.split(",").slice(0, 2).join(",");
    }

    return "No location";
  };

  return (
    <CoachDashboardLayout>
      <div className="w-full mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Lịch đặt</h1>
          <p className="text-sm text-gray-500">Xem và quản lý lịch huấn luyện của bạn</p>
        </div>

        {/* Calendar Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-700" />
            <span className="text-lg font-semibold text-gray-800">Chọn ngày</span>
          </div>

          <div>
            <DatePicker
              selected={currentDate}
              onChange={(date: Date | null) => date && setCurrentDate(date)}
              dateFormat="MMMM d, yyyy"
              className="border rounded px-2 py-1 w-52 cursor-pointer"
            />
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={handlePrevWeek} className="flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <div className="text-center font-medium text-gray-700">
            {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM dd")} -{" "}
            {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM dd, yyyy")}
          </div>
          <Button variant="outline" onClick={handleNextWeek} className="flex items-center gap-1">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 w-20 text-center">Time</th>
                {days.map((day, idx) => (
                  <th key={idx} className="border p-2 bg-gray-100 text-center">
                    {format(day, "EEE dd/MM")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* Time Column */}
                <td className="border p-0">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="border-b flex items-center justify-center text-xs bg-gray-50"
                      style={{ height: `${hourHeight}px` }}
                    >
                      {hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`}
                    </div>
                  ))}
                </td>

                {/* Day Columns */}
                {days.map((day, dayIdx) => {
                  const dayBookings = getBookingsForDay(day)
                  return (
                    <td
                      key={dayIdx}
                      className="border p-0 relative"
                      style={{ height: `${hours.length * hourHeight}px` }}
                    >
                      {dayBookings.map((b) => {
                        const [startH, startM] = b.startTime.split(":").map(Number)
                        const [endH, endM] = b.endTime.split(":").map(Number)
                        const top = (startH + startM / 60 - firstHour) * hourHeight
                        const height = (endH + endM / 60 - startH - startM / 60) * hourHeight
                        const bookingUserName =
                          typeof b.user === "object" && b.user !== null
                            ? b.user.fullName
                            : typeof b.user === "string"
                              ? b.user
                              : "Unknown User"
                        return (
                          <div
                            key={b._id}
                            className="absolute left-1 right-1 bg-blue-50 border border-blue-200 rounded-lg shadow-sm text-xs overflow-hidden flex flex-col justify-center items-center text-center p-1 cursor-pointer hover:bg-blue-100"
                            style={{ top, height }}
                            onClick={() => setSelectedBooking(b)}
                          >
                            {b.field?.name && (
                              <p className="font-medium">{b.field.name}</p>
                            )}
                            {b.field?.location && (
                              <p className="text-gray-500">{getShortLocation(b.field.location)}</p>
                            )}
                            {!b.field?.name && !b.field?.location && (
                              <p className="font-medium">{bookingUserName}</p>
                            )}
                          </div>
                        )
                      })}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Booking Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-[400px] max-w-full relative">
              <button
                className="absolute top-2 right-2 p-1"
                onClick={() => setSelectedBooking(null)}
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <img
                  src={bookingUser?.avatarUrl ?? "/default-avatar.png"}
                  alt={bookingUser?.fullName ?? "User"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <p className="font-medium">
                  {bookingUser?.fullName ?? "Unknown User"}
                </p>
              </div>

              {/* Only display Field and Location if they exist */}
              {selectedBooking.field?.name && (
                <p className="mb-2">
                  <strong>Field:</strong> {selectedBooking.field.name}
                </p>
              )}
              {selectedBooking.field?.location && (
                <p className="mb-2">
                  <strong>Location:</strong> {getShortLocation(selectedBooking.field.location)}
                </p>
              )}

              {/* Always show booker info and booking details */}
              <p className="mb-2">
                <strong>Booker:</strong> {bookingUser?.fullName ?? "Unknown User"}
              </p>
              <p className="mb-2">
                <strong>Date:</strong> {format(new Date(selectedBooking.date), "MMM dd, yyyy")}
              </p>
              <p className="mb-2">
                <strong>Time:</strong> {selectedBooking.startTime} - {selectedBooking.endTime}
              </p>
              <p className="mb-2">
                <strong>Total Price:</strong> {selectedBooking.bookingAmount} VND
              </p>
            </div>
          </div>
        )}
      </div>
    </CoachDashboardLayout>
  )
}
