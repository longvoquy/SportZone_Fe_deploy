import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Loading } from "@/components/ui/loading"
import { Star, ChevronDown, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAppDispatch, useAppSelector } from "@/store/hook"
import { createFieldReviewThunk } from "@/features/reviews/reviewThunk"
import { getReviewsForFieldAPI } from "@/features/reviews/reviewAPI"
import { getFieldById } from "@/features/field/fieldThunk"
import { CustomSuccessToast, CustomFailedToast } from "@/components/toast/notificiation-toast"
import logger from "@/utils/logger"

interface RatingCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  ratingValue: number
  reviewCount: number
  fieldId: string
}

export const RatingCard: React.FC<RatingCardProps> = ({ refObj, id, ratingValue, reviewCount, fieldId }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewTitle, setReviewTitle] = useState("")
  const [reviewComment, setReviewComment] = useState("")
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [fieldReviews, setFieldReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsPage, setReviewsPage] = useState(1)
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1)
  const REVIEW_PAGE_LIMIT = 5
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null)

  const dispatch = useAppDispatch()
  const authUser = useAppSelector((state) => state.auth.user)

  const userHasReviewed = useMemo(() => {
    if (!authUser || !fieldReviews || fieldReviews.length === 0) return false
    const uid = (authUser as any)?.id || (authUser as any)?._id || (authUser as any)?.userId
    if (!uid) return false
    return fieldReviews.some((r) => {
      const rid = r?.user?.id || r?.user?._id || r?.user
      return String(rid) === String(uid)
    })
  }, [authUser, fieldReviews])

  // Always use global stats from props for summary
  const calculatedRating = ratingValue;
  const calculatedReviewCount = reviewCount;

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

  useEffect(() => {
    if (!showReviewModal) {
      setReviewRating(0)
      setHoveredRating(0)
      setReviewTitle("")
      setReviewComment("")
      setReviewError(null)
      setHasAcceptedTerms(false)
      setIsSubmittingReview(false)
    }
  }, [showReviewModal])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setReviewError(null)

    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      CustomFailedToast("Vui lòng chọn điểm đánh giá từ 1 đến 5")
      return
    }
    if (!reviewComment || reviewComment.trim().length < 10) {
      CustomFailedToast("Vui lòng nhập nội dung đánh giá (tối thiểu 10 ký tự)")
      return
    }
    if (!hasAcceptedTerms) {
      CustomFailedToast("Vui lòng đồng ý với Điều khoản & Điều kiện")
      return
    }

    setIsSubmittingReview(true)
    try {
      const payload = {
        type: "field" as const,
        rating: reviewRating,
        comment: reviewComment.trim(),
        title: reviewTitle.trim() ? reviewTitle.trim() : undefined,
        fieldId: fieldId,
        bookingId: "", // Optional - can be enhanced later to select from user bookings
      }

      const action: any = await dispatch(createFieldReviewThunk(payload as any))

      if (action?.meta?.requestStatus === "fulfilled") {
        setShowReviewModal(false)
        setReviewRating(0)
        setHoveredRating(0)
        setReviewTitle("")
        setReviewComment("")
        setHasAcceptedTerms(false)

        CustomSuccessToast("Cảm ơn bạn — đánh giá đã được gửi.")

        // Wait a bit for database to save, then refresh both reviews and field data
        setTimeout(async () => {
          try {
            logger.debug('[RATING CARD] Refreshing reviews and field data after submit')
            // Refresh reviews to show the new review
            await fetchReviews(1, false)
            // Refresh field data to update rating and reviewCount
            await dispatch(getFieldById(fieldId))
            logger.debug('[RATING CARD] Successfully refreshed data')
          } catch (err) {
            logger.error('[RATING CARD] Failed to refresh data after submit', err)
          }
        }, 800) // 800ms delay to ensure database has saved
      } else {
        const errData = action?.payload || {};
        const message = typeof errData === 'string' ? errData : (errData.message || "Gửi đánh giá thất bại");
        const flaggedWords = Array.isArray(errData.flaggedWords) ? errData.flaggedWords : [];

        if (String(message).toLowerCase().includes('inappropriate') ||
          String(message).toLowerCase().includes('profanity') ||
          String(message).toLowerCase().includes('content')) {
          let finalMsg = String(message);
          if (flaggedWords.length > 0) {
            finalMsg += ` Flagged words: ${flaggedWords.join(', ')}`;
          }
          setReviewError(finalMsg);
        } else {
          CustomFailedToast(String(message))
        }
      }
    } catch (err: any) {
      const msg = err?.message || "Gửi đánh giá thất bại";
      if (String(msg).toLowerCase().includes('inappropriate') ||
        String(msg).toLowerCase().includes('profanity')) {
        setReviewError(String(msg));
      } else {
        CustomFailedToast(msg)
      }
    } finally {
      setIsSubmittingReview(false)
    }
  }

  return (
    <>
      <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
        <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Đánh giá</CardTitle>
            <div className="flex items-center gap-3">
              {authUser && !userHasReviewed && (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Viết đánh giá
                </Button>
              )}
              {authUser && userHasReviewed && (
                <Button size="sm" variant="outline" disabled className="text-gray-500">
                  Bạn đã đánh giá
                </Button>
              )}
              <ChevronDown
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-5 h-5 transition-transform duration-200 cursor-pointer ${isExpanded ? "rotate-180" : "rotate-0"
                  }`}
              />
            </div>
          </div>
        </CardHeader>
        {isExpanded && (
          <>
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
          </>
        )}
      </Card>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Viết đánh giá</DialogTitle>
            <DialogDescription>Chia sẻ trải nghiệm của bạn về sân thể thao này</DialogDescription>
          </DialogHeader>
          <form className="space-y-6 py-4" onSubmit={handleSubmitReview}>
            {/* Tiêu đề đánh giá (optional) */}
            {reviewError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start gap-2 text-sm mb-4">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="review-title" className="text-sm font-semibold">
                Tiêu đề đánh giá
              </Label>
              <Input
                id="review-title"
                placeholder="Nếu mô tả trong một câu, bạn sẽ nói gì?"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
              />
            </div>

            {/* Điểm đánh giá */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Điểm đánh giá <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`h-8 w-8 transition-colors ${star <= (hoveredRating || reviewRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                          }`}
                      />
                    </button>
                  ))}
                </div>
                {reviewRating > 0 && (
                  <span className="text-sm font-semibold text-gray-600 ml-2">
                    {reviewRating}.0
                  </span>
                )}
              </div>
            </div>

            {/* Nội dung đánh giá */}
            <div className="space-y-2">
              <Label htmlFor="review-comment" className="text-sm font-semibold">
                Đánh giá chi tiết <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="review-comment"
                placeholder="Chia sẻ trải nghiệm của bạn về sân thể thao này (tối thiểu 10 ký tự)..."
                rows={6}
                className="resize-none"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                minLength={10}
              />
              <p className={`text-xs ${reviewComment.trim().length >= 10 ? "text-green-600" : "text-gray-500"}`}>
                {reviewComment.trim().length}/500 ký tự tối đa
              </p>
            </div>

            {/* Điều khoản & điều kiện */}
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="review-terms"
                checked={hasAcceptedTerms}
                onCheckedChange={(checked) => setHasAcceptedTerms(!!checked)}
              />
              <label
                htmlFor="review-terms"
                className="text-xs text-gray-600 leading-snug cursor-pointer select-none"
              >
                Tôi đã đọc và đồng ý với{" "}
                <span className="text-green-700 font-medium">Điều khoản &amp; Điều kiện</span>
              </label>
            </div>

            {/* Nút hành động */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowReviewModal(false)
                  setReviewRating(0)
                  setHoveredRating(0)
                  setReviewTitle("")
                  setReviewComment("")
                  setReviewError(null)
                  setHasAcceptedTerms(false)
                }}
                className="flex-1 hover:bg-gray-50 bg-transparent"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                disabled={isSubmittingReview}
              >
                {isSubmittingReview && <Loading size={16} />}
                {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RatingCard