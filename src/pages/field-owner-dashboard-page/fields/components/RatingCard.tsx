import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loading } from "@/components/ui/loading"
import { Star, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getReviewsForFieldAPI } from "@/features/reviews/reviewAPI"
import logger from "@/utils/logger"

interface RatingCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  ratingValue: number
  reviewCount: number
  fieldId: string
}

export const RatingCard: React.FC<RatingCardProps> = ({ refObj, id, ratingValue, reviewCount, fieldId }) => {
  const [fieldReviews, setFieldReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1)
  const REVIEW_PAGE_LIMIT = 5
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null)

  // Calculate average rating and review count from actual reviews
  const calculatedRating = useMemo(() => {
    if (!fieldReviews || fieldReviews.length === 0) {
      return ratingValue // Fallback to prop value
    }
    const validReviews = fieldReviews.filter(
      (r) => r && (r.rating !== undefined && r.rating !== null),
    )
    if (validReviews.length === 0) {
      return ratingValue
    }

    const sum = validReviews.reduce((acc, review) => {
      const rating = Number(review.rating) || 0
      return acc + rating
    }, 0)
    const avg = sum / validReviews.length
    const finalRating = Number.isFinite(avg) ? Math.max(0, Math.min(5, avg)) : ratingValue
    return finalRating
  }, [fieldReviews, ratingValue])

  const calculatedReviewCount = useMemo(() => {
    // Use actual review count if available, otherwise fallback to prop
    return fieldReviews.length > 0 ? fieldReviews.length : reviewCount
  }, [fieldReviews, reviewCount])

  // Fetch reviews for this field
  const fetchReviews = useCallback(
    async (page = 1, append = false) => {
      if (!fieldId) return
      try {
        setReviewsLoading(true)
        const resp = await getReviewsForFieldAPI(fieldId, page, REVIEW_PAGE_LIMIT)

        // Handle different response formats
        let items: any[] = []
        if (Array.isArray(resp)) {
          items = resp
        } else if (Array.isArray(resp?.data)) {
          items = resp.data
        } else if (resp?.data?.data && Array.isArray(resp.data.data)) {
          items = resp.data.data
        } else if (resp?.data && typeof resp.data === "object" && !Array.isArray(resp.data)) {
          // If data is an object, try to extract array from it
          items = []
        }

        if (append) {
          setFieldReviews((prev) => [...prev, ...items])
        } else {
          setFieldReviews(items)
        }

        const pagination = resp?.pagination || resp?.data?.pagination || {}
        setReviewsPage(pagination.page ?? page)
        setReviewsTotalPages(pagination.totalPages ?? 1)
      } catch (err) {
        logger.error('[RATING CARD] Failed to load field reviews', err)
        // Don't clear existing reviews on error, just log it
      } finally {
        setReviewsLoading(false)
      }
    },
    [fieldId],
  )

  useEffect(() => {
    if (fieldId) {
      fetchReviews(1, false)
    }
  }, [fieldId, fetchReviews])

  const filteredReviews = useMemo(() => {
    if (!selectedRatingFilter) return fieldReviews
    return fieldReviews.filter((rv) => Math.round(Number(rv.rating || 0)) === selectedRatingFilter)
  }, [fieldReviews, selectedRatingFilter])

  return (
    <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Đánh giá</CardTitle>
      </CardHeader>
        <hr className="border-t border-gray-300 my-0 mx-6" />
        <CardContent className="pt-6">
              {/* Rating Summary Section */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-8">
                  {/* Left: Rating Score */}
                  <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-sm min-w-[140px]">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {calculatedRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">trên 5.0</div>
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.round(calculatedRating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{calculatedReviewCount} đánh giá</p>
                  </div>

                  {/* Right: Rating Breakdown */}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Được giới thiệu bởi {calculatedReviewCount > 0 ? Math.round((calculatedRating / 5) * 100) : 0}% người chơi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {["Chất lượng sân", "Dịch vụ", "Vị trí", "Giá cả"].map((category, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{category}</span>
                            <span className="font-semibold text-gray-900">{calculatedRating.toFixed(1)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(calculatedRating / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews List */}
              {/* Filter controls */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-gray-600">Lọc theo:</span>
                <button
                  onClick={() => setSelectedRatingFilter(null)}
                  className={`text-sm px-2 py-1 rounded ${selectedRatingFilter === null ? 'bg-green-600 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
                >
                  Tất cả
                </button>
                {Array.from({ length: 5 }, (_, i) => 5 - i).map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRatingFilter(star)}
                    className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded ${selectedRatingFilter === star ? 'bg-green-600 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: star }).map((_, s) => (
                        <Star key={s} className="h-3 w-3 text-yellow-400" />
                      ))}
                    </div>
                    <span className="ml-1">{star}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-3 min-h-[100px] flex flex-col justify-center">
                {reviewsLoading ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <Loading size={24} className="text-green-600" />
                    <div className="text-gray-500 text-xs">Đang tải đánh giá...</div>
                  </div>
                ) : fieldReviews && fieldReviews.length > 0 ? (
                  filteredReviews.length === 0 ? (
                    <div className="text-gray-500 text-center py-4 text-sm">Không có đánh giá phù hợp với bộ lọc.</div>
                  ) : (
                    filteredReviews.map((r: any, idx: number) => {
                      const author = r.user?.fullName || 'Anonymous'
                      const rating = r.rating || 0
                      const comment = r.comment || ''
                      const dateStr = r.createdAt || r.booking?.createdAt
                      const date = dateStr ? new Date(dateStr).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : ''
                      const avatarUrl = r.user?.avatarUrl

                      return (
                        <Card key={idx} className="py-0 rounded-none border-0">
                          <CardContent className="">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback>
                                  {author
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h4 className="font-semibold text-sm text-gray-900">{author}</h4>
                                  <span className="text-xs text-gray-500">{date}</span>
                                </div>
                                {r.title && (
                                  <p className="text-sm font-semibold text-gray-800 leading-snug">
                                    {r.title}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-gray-700 leading-snug flex-1 min-w-0">{comment}</p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: 5 }).map((_, s) => (
                                        <Star
                                          key={s}
                                          className={`h-3 w-3 ${s < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600">{rating.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )
                ) : (
                  <div className="text-gray-500 text-center py-4 text-sm">Chưa có đánh giá.</div>
                )}
              </div>

              {/* Pagination */}
              {fieldReviews.length > 0 && reviewsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                      if (reviewsLoading || reviewsPage <= 1) return
                      await fetchReviews(reviewsPage - 1, false)
                    }}
                    disabled={reviewsLoading || reviewsPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {Array.from({ length: reviewsTotalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === reviewsPage ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${page === reviewsPage
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "hover:bg-gray-50"
                        }`}
                      onClick={async () => {
                        if (reviewsLoading || page === reviewsPage) return
                        await fetchReviews(page, false)
                      }}
                      disabled={reviewsLoading}
                    >
                      {page}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                      if (reviewsLoading || reviewsPage >= reviewsTotalPages) return
                      await fetchReviews(reviewsPage + 1, false)
                    }}
                    disabled={reviewsLoading || reviewsPage >= reviewsTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
        </CardContent>
    </Card>
  )
}

export default RatingCard