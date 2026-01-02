import React, { useMemo, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { getSportDisplayNameVN } from "@/components/enums/ENUMS"

interface PriceRange {
  day: string
  start: string
  end: string
  multiplier: number
  _id?: string
}

interface PricingTableCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  priceRanges?: PriceRange[]
  basePrice?: number
  sportType?: string
}

const dayNames: Record<string, string> = {
  monday: "T2",
  tuesday: "T3",
  wednesday: "T4",
  thursday: "T5",
  friday: "T6",
  saturday: "T7",
  sunday: "CN",
}

export const PricingTableCard: React.FC<PricingTableCardProps> = ({
  refObj,
  id,
  priceRanges = [],
  basePrice = 0,
  sportType = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Group price ranges by time slots
  const groupedPrices = useMemo(() => {
    if (!priceRanges || priceRanges.length === 0 || !basePrice) {
      return []
    }

    // Group by time slot (start-end) and multiplier
    const timeSlotMap = new Map<string, { days: string[]; start: string; end: string; multiplier: number; price: number }>()

    priceRanges.forEach((range) => {
      // Skip if essential data is missing
      if (!range.start || !range.end) return;

      const key = `${range.start}-${range.end}-${range.multiplier}`
      const price = Math.round(basePrice * range.multiplier)

      if (timeSlotMap.has(key)) {
        const existing = timeSlotMap.get(key)!
        existing.days.push(range.day)
      } else {
        timeSlotMap.set(key, {
          days: [range.day],
          start: range.start,
          end: range.end,
          multiplier: range.multiplier,
          price,
        })
      }
    })

    // Convert to array and sort days
    const result = Array.from(timeSlotMap.values()).map((group) => {
      // Sort days by order: monday, tuesday, ..., sunday
      const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      group.days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
      return group
    })

    // Sort by start time
    result.sort((a, b) => a.start.localeCompare(b.start))

    return result
  }, [priceRanges, basePrice])

  // Format time from "HH:mm" to "Hh" format
  const formatTime = (time: string) => {
    if (!time) return ""
    try {
      const [hours] = time.split(":")
      return `${parseInt(hours)}h`
    } catch (e) {
      return time
    }
  }

  // Format day range (e.g., "T2 - CN" or "T2, T3")
  const formatDayRange = (days: string[]) => {
    if (days.length === 0) return ""
    if (days.length === 1) return dayNames[days[0]] || days[0]

    // Check if all days are consecutive
    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    const sortedDays = [...days].sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

    // Check if it's a full week
    if (sortedDays.length === 7) {
      return "T2 - CN"
    }

    // Check if consecutive
    let isConsecutive = true
    for (let i = 1; i < sortedDays.length; i++) {
      const prevIndex = dayOrder.indexOf(sortedDays[i - 1])
      const currIndex = dayOrder.indexOf(sortedDays[i])
      if (currIndex !== prevIndex + 1) {
        isConsecutive = false
        break
      }
    }

    if (isConsecutive && sortedDays.length > 1) {
      return `${dayNames[sortedDays[0]]} - ${dayNames[sortedDays[sortedDays.length - 1]]}`
    }

    // Not consecutive, join with comma
    return sortedDays.map(d => dayNames[d] || d).join(", ")
  }

  if (!priceRanges || priceRanges.length === 0 || !basePrice) {
    return (
      <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
        <CardHeader onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer hover:bg-gray-50 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Bảng giá sân</CardTitle>
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
          </div>
        </CardHeader>
        {isExpanded && (
          <>
            <hr className="border-t border-gray-300 my-0 mx-6" />
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center py-4">Chưa có thông tin bảng giá</p>
            </CardContent>
          </>
        )}
      </Card>
    )
  }

  return (
    <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
      <CardHeader onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer hover:bg-gray-50 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg">Bảng giá sân</CardTitle>
          <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
        </div>
      </CardHeader>
      {isExpanded && (
        <>
          <hr className="border-t border-gray-300 my-0 mx-6" />
          <CardContent className="pt-6">
            {sportType && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-green-700">{getSportDisplayNameVN(sportType)}</h3>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Thứ</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Khung giờ</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedPrices.map((group, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {formatDayRange(group.days)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {formatTime(group.start)} - {formatTime(group.end)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-green-700">
                        {group.price.toLocaleString('vi-VN')} ₫
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

export default PricingTableCard

