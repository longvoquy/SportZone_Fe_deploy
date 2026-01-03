import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Award, Calendar, CheckCircle2, Bookmark, Mail } from "lucide-react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "@/store/store";
import { getCoachStatsThunk } from "@/features/reviews/reviewThunk";

interface CoachInfoCardProps {
  coachData: any;
  coachReviews: any[];
  isBookmark: boolean;
  favLoading: boolean;
  onToggleBookmark: () => void;
  onOpenChat?: () => void;
}

export const CoachInfoCard: React.FC<CoachInfoCardProps> = ({
  coachData,
  coachReviews,
  isBookmark,
  favLoading,
  onToggleBookmark,
  onOpenChat,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  // Resolve coach id from available shapes
  const coachId = (coachData && (coachData.id || coachData._id || coachData.user?.id || coachData.user?._id)) || null;

  // Select aggregated stats from redux (may be null if not loaded)
  const coachStats = useSelector((state: RootState) => (coachId ? state.reviews?.coachStats?.[coachId] ?? null : null));

  useEffect(() => {
    if (coachId && !coachStats) {
      dispatch(getCoachStatsThunk(coachId));
    }
  }, [dispatch, coachId, coachStats]);

  const totalReviews = coachStats?.totalReviews ?? (Array.isArray(coachReviews) ? coachReviews.length : 0);
  const avgRating = coachStats?.averageRating ?? (coachData?.rating ? Number(coachData.rating) : null);
  return (
    <Card className="shadow-2xl border-0 animate-fade-in-up bg-white">
      <CardContent className="p-6">
        {coachData ? (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Coach Avatar */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 rounded-full bg-emerald-500/70 group-hover:bg-emerald-500 blur transition duration-300" />
              <Avatar className="relative h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage
                  src={
                    coachData.avatar ||
                    coachData.profileImage ||
                    "/professional-coach-portrait.png"
                  }
                  alt={coachData.name}
                />
                <AvatarFallback className="text-2xl bg-emerald-600 text-white">
                  {coachData.name
                    ?.split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Coach Info */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap w-full">
                  <h1 className="text-3xl font-bold text-balance">
                    {coachData.name}
                  </h1>
                  <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    {/* Chat icon button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-100"
                      onClick={() => onOpenChat && onOpenChat()}
                      aria-label="Nhắn tin với HLV"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    {/* Bookmark button */}
                    <Button
                      size="sm"
                      onClick={onToggleBookmark}
                      disabled={favLoading}
                      className={`${isBookmark ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} ${isBookmark ? 'text-white' : ''} border-0 flex items-center gap-2`}
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmark ? 'fill-white' : ''}`} />
                      {favLoading ? 'Đang xử lý...' : isBookmark ? 'Đã bookmark' : 'Bookmark'}
                    </Button>
                  </div>
                </div>
                <p className="text-base text-muted-foreground text-left">
                  {coachData.description}
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {/* Only show rating if there are reviews */}
                {totalReviews > 0 && avgRating !== null && !Number.isNaN(avgRating) ? (
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-1.5 rounded">
                      <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                    </div>
                    <span className="font-semibold">{Number(avgRating).toFixed(1)}</span>
                    <span className="text-muted-foreground">{totalReviews} đánh giá</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="bg-yellow-100 p-1.5 rounded">
                      <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
                    </div>
                    <span className="text-muted-foreground">Chưa có đánh giá</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{coachData.location}</span>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>Hạng: {coachData.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Buổi đã hoàn thành: {coachData.completedSessions}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Tham gia Dreamsports từ: {coachData.memberSince
                      ? new Date(
                        coachData.memberSince
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            Coach data not found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

