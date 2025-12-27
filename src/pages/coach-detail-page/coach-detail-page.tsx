"use client";
import { useParams, useNavigate } from "react-router-dom";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import logger from "@/utils/logger";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import { getCoachById, clearCurrentCoach, getPublicCoaches } from "@/features/coach";
import { setFavouriteCoaches, removeFavouriteCoaches, getUserProfile } from "@/features/user";
import { createCoachReviewThunk, getCoachStatsThunk } from "@/features/reviews/reviewThunk";
import { getReviewsForCoachAPI } from "@/features/reviews/reviewAPI";
import {
  CustomFailedToast,
  CustomSuccessToast,
} from "@/components/toast/notificiation-toast";
import type { RootState, AppDispatch } from "@/store/store";
import { NavbarDarkComponent } from "@/components/header/navbar-dark-component";
import { PageWrapper } from "@/components/layouts/page-wrapper";
// Import components
import { CoachInfoCard } from "./components/CoachInfoCard";
import { CoachTabs } from "./components/CoachTabs";
import { BioSection } from "./components/BioSection";
import { GallerySection } from "./components/GallerySection";
import { ReviewsSection } from "./components/ReviewsSection";
import { LocationSection } from "./components/LocationSection";
import { BookingCard } from "./components/BookingCard";
import { SimilarCoachesSection } from "./components/SimilarCoachesSection";
import { ReviewModal } from "./components/ReviewModal";
import CoachDetailChatWindow from "@/components/chat/CoachDetailChatWindow";
import { Loading } from "@/components/ui/loading";

interface CoachDetailPageProps {
  coachId?: string;
}

export default function CoachDetailPage({ coachId }: CoachDetailPageProps) {
  const params = useParams();
  const navigate = useNavigate();
  const effectiveCoachId = coachId ?? params.id;
  const dispatch = useDispatch<AppDispatch>();
  const { currentCoach, detailLoading, detailError } = useSelector(
    (state: RootState) => state.coach
  );
  const authUser = useSelector((state: RootState) => state.auth.user);

  const [favLoading, setFavLoading] = useState(false);

  const favouriteCoachIds: string[] = Array.isArray(authUser?.favouriteCoaches)
    ? authUser!.favouriteCoaches.map((c: any) => (typeof c === 'string' ? c : (c._id || c.id || String(c))))
    : [];

  const isFavourite = Boolean(effectiveCoachId && favouriteCoachIds.includes(effectiveCoachId as string));

  const toggleFavourite = async () => {
    if (!authUser) {
      return CustomFailedToast("Vui lòng đăng nhập để thêm huấn luyện viên vào yêu thích");
    }
    if (!effectiveCoachId) return;

    try {
      setFavLoading(true);
      if (isFavourite) {
        const payload = { favouriteCoaches: [effectiveCoachId as string] };
        const action: any = await dispatch(removeFavouriteCoaches(payload));
        if (action?.meta?.requestStatus === "fulfilled") {
          CustomSuccessToast("Đã bỏ yêu thích");
        } else {
          const pl = action?.payload;
          const message = typeof pl === 'string' ? pl : pl?.message ?? (pl ? JSON.stringify(pl) : "Bỏ yêu thích thất bại");
          logger.error('Remove favourite failed', { payload: pl, error: action?.error });
          CustomFailedToast(message);
        }
      } else {
        const payload = { favouriteCoaches: [effectiveCoachId as string] };
        const action: any = await dispatch(setFavouriteCoaches(payload));
        if (action?.meta?.requestStatus === "fulfilled") {
          CustomSuccessToast("Đã thêm vào yêu thích");
        } else {
          const pl = action?.payload;
          const message = typeof pl === 'string' ? pl : pl?.message ?? (pl ? JSON.stringify(pl) : "Thêm yêu thích thất bại");
          logger.error('Set favourite failed', { payload: pl, error: action?.error });
          CustomFailedToast(message);
        }
      }
    } catch (err: any) {
      CustomFailedToast(err?.message || "Thao tác thất bại");
    } finally {
      setFavLoading(false);
      try {
        // refresh profile to sync favouriteCoaches state with server
        dispatch(getUserProfile());
      } catch (err: any) {
        logger.error('Failed to refresh profile', err);
      }
    }
  };

  const [activeTab, setActiveTab] = useState("bio");
  const [showCoachChat, setShowCoachChat] = useState(false);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showProfanityAlert, setShowProfanityAlert] = useState(false);
  const [flaggedWords, setFlaggedWords] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [coachReviews, setCoachReviews] = useState<any[]>([]);
  // Coach aggregated stats from redux
  const coachStats = useSelector((state: RootState) =>
    effectiveCoachId ? state.reviews?.coachStats?.[effectiveCoachId] ?? null : null
  );
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const REVIEW_PAGE_LIMIT = 5;
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | null>(null);

  // Leaflet map refs for location section
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const currentCoachRef = useRef(currentCoach);

  // Keep ref in sync with currentCoach
  useEffect(() => {
    currentCoachRef.current = currentCoach;
  }, [currentCoach]);

  const filteredReviews = useMemo(() => {
    const base = Array.isArray(coachReviews) ? coachReviews : [];
    if (!selectedRatingFilter) return base;
    return base.filter((rv) => Math.round(Number(rv.rating || 0)) === selectedRatingFilter);
  }, [coachReviews, selectedRatingFilter]);

  // Booking states (removed - no longer needed)

  // Fetch coach data when component mounts or coachId changes
  useEffect(() => {
    if (effectiveCoachId) {
      dispatch(getCoachById(effectiveCoachId));
      // fetch aggregated coach stats for UI
      try {
        dispatch(getCoachStatsThunk(effectiveCoachId));
      } catch (e) {
        logger.error('Failed to dispatch getCoachStatsThunk', e);
      }
    }
  }, [dispatch, effectiveCoachId]);

  // Ensure auth profile (favouriteCoaches) is fresh on page load so the favorite
  // button correctly reflects server state. Only refresh when favourites are
  // missing or don't include the current coach id.
  useEffect(() => {
    if (!effectiveCoachId) return;
    const needRefresh = !authUser || !Array.isArray(authUser.favouriteCoaches) || !authUser.favouriteCoaches.includes(effectiveCoachId as string);
    if (needRefresh) {
      dispatch(getUserProfile());
    }
  }, [dispatch, effectiveCoachId, authUser]);

  const handleBookNow = () => {
    if (!effectiveCoachId) {
      CustomFailedToast('Không tìm thấy thông tin huấn luyện viên');
      return;
    }
    // Navigate to booking flow
    navigate(`/coaches/${effectiveCoachId}/booking`);
  };

  // Fetch reviews for this coach (paginated) and set up auto-refresh (polling)
  const fetchReviews = useCallback(
    async (page = 1, append = false) => {
      if (!effectiveCoachId) return;
      try {
        setReviewsLoading(true);
        const resp = await getReviewsForCoachAPI(effectiveCoachId, page, REVIEW_PAGE_LIMIT);

        // Normalize possible API shapes:
        // 1) { data: [...], pagination: { ... } }
        // 2) { success: true, data: { data: [...], pagination: { ... } } }
        // 3) direct array (unlikely)
        let body: any = resp;
        if (resp && typeof resp === 'object' && 'success' in resp && 'data' in resp) {
          body = resp.data;
        }

        const items = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : [];

        const pageFromResp = body?.pagination?.page ?? resp?.pagination?.page ?? page;
        const totalPagesFromResp = body?.pagination?.totalPages ?? resp?.pagination?.totalPages ?? 1;

        if (append) setCoachReviews((prev) => [...prev, ...items]);
        else setCoachReviews(items);

        setReviewsPage(pageFromResp ?? page);
        setReviewsTotalPages(totalPagesFromResp ?? 1);
      } catch (err) {
        logger.error('Failed to load coach reviews', err);
      } finally {
        setReviewsLoading(false);
      }
    },
    [effectiveCoachId],
  );

  useEffect(() => {
    if (!effectiveCoachId) return;
    // initial fetch page 1
    fetchReviews(1, false);
    // Slow down polling and avoid work while tab hidden
    const POLL_INTERVAL_MS = 120000; // 2 minutes
    const tick = () => { if (!document.hidden) fetchReviews(1, false); };
    const timer = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [effectiveCoachId, fetchReviews]);

  // Cleanup coach data when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearCurrentCoach());
      // Cleanup map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [dispatch]);

  // Map initialization and updates are now handled in LocationSection component

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        "bio",
        "coaching",
        "gallery",
        "reviews",
        "location",
      ];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveTab(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100;
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const nextGallerySlide = () => {
    setCurrentGalleryIndex((prev) => (prev + 1) % (galleryImages.length - 2));
  };

  const prevGallerySlide = () => {
    setCurrentGalleryIndex(
      (prev) =>
        (prev - 1 + (galleryImages.length - 2)) % (galleryImages.length - 2)
    );
  };

  const tabs = [
    { id: "bio", label: "Giới thiệu" },
    { id: "coaching", label: "Huấn luyện" },
    { id: "gallery", label: "Thư viện ảnh" },
    { id: "reviews", label: "Đánh giá" },
    { id: "location", label: "Vị trí" },
  ];

  const galleryImages = (() => {
    const src = (currentCoach as any)?.galleryImages ?? (currentCoach as any)?.gallery ?? (currentCoach as any)?.photos;
    if (Array.isArray(src) && src.length > 0) {
      return src.map((item: any, idx: number) => {
        if (typeof item === 'string') return { url: item, alt: `Gallery image ${idx + 1}` };
        if (item && typeof item === 'object') return { url: item.url || item.src || String(item), alt: item.alt || item.caption || `Gallery image ${idx + 1}` };
        return { url: String(item), alt: `Gallery image ${idx + 1}` };
      });
    }

    return [
      { url: "/badminton-player-training-on-green-court.jpg", alt: "Training session 1" },
      { url: "/badminton-player-hitting-shuttlecock.jpg", alt: "Court practice" },
      { url: "/badminton-court-with-net-and-lights.jpg", alt: "Coaching session" },
      { url: "/badminton-doubles-match.jpg", alt: "Group training" },
      { url: "/badminton-player-serving.jpg", alt: "Serving practice" },
      { url: "/badminton-indoor-court.jpg", alt: "Indoor facility" },
    ];
  })();

  //   const reviews = [
  //     {
  //       name: "Amanda Rosales",
  //       date: "09/26/2023",
  //       rating: 5,
  //       title: "Absolutely Perfect!",
  //       content:
  //         "Amazing facility. It is a perfect place for friendly match with your friends or a competitive match. It is the best place.",
  //       images: [
  //         "/badminton-court-1.jpg",
  //         "/badminton-court-2.jpg",
  //         "/badminton-court-3.jpg",
  //         "/badminton-court-4.jpg",
  //         "/badminton-court-5.jpg",
  //       ],
  //       helpful: 12,
  //     },
  //     {
  //       name: "Michael Chen",
  //       date: "09/18/2023",
  //       rating: 5,
  //       title: "Awesome. Its very convenient to play.",
  //       content:
  //         "Amazing facility. It is a perfect place for friendly match with your friends or a competitive match. Excellent coaching and atmosphere. Highly recommended for an exceptional playing experience.",
  //       helpful: 8,
  //     },
  //   ];

  const similarCoaches = [
    {
      id: 'sample-kevin',
      name: "Kevin Anderson",
      sport: "basketball,badminton",
      location: "Los Angeles, CA",
      rating: 4.9,
      reviews: 89,
      sessions: 156,
      availability: "Fri, Sept 2023",
      price: 180,
      image: "/male-tennis-coach.png",
      featured: true,
      color: "bg-pink-100",
    },
    {
      id: 'sample-angela',
      name: "Angela Rodriguez",
      sport: "basketball,badminton",
      location: "Chicago, IL",
      rating: 4.8,
      reviews: 124,
      sessions: 203,
      availability: "Fri, Sept 2023",
      price: 220,
      image: "/female-basketball-coach.png",
      featured: false,
      color: "bg-orange-100",
    },
    {
      id: 'sample-evan',
      name: "Evan Roddick",
      sport: "basketball,badminton",
      location: "Miami, FL",
      rating: 4.7,
      reviews: 67,
      sessions: 134,
      availability: "Sat, Sept 2023",
      price: 195,
      image: "/male-soccer-coach.png",
      featured: true,
      color: "bg-blue-100",
    },
  ];

  const [similarCoachesState, setSimilarCoachesState] = useState<any[]>([]);

  // Fetch public coaches similar to this coach (by sports) and map to UI shape
  useEffect(() => {
    let mounted = true;
    const fetchSimilar = async () => {
      try {
        const sports = Array.isArray(currentCoach?.sports) ? (currentCoach!.sports as string[]) : [];
        const action: any = await dispatch(getPublicCoaches({ sports }));
        if (action?.meta?.requestStatus === "fulfilled") {
          const items = action.payload?.data ?? [];
          const mapped = (items as any[])
            .filter((c) => (c?.id || "") !== (currentCoach?.id || ""))
            .slice(0, 3)
            .map((c) => ({
              id: c.id || c._id || "",
              name: c.name || c.fullName || "HLV",
              sport: Array.isArray(c.sports) && c.sports.length ? (c.sports as string[]).join(',') : (c.sport || "Coach"),
              location: c.location || "",
              rating: Number(c.rating ?? 0),
              reviews: Number(c.totalReviews ?? 0),
              sessions: Number(c.completedSessions ?? 0),
              availability: c.nextAvailability ?? "",
              price: Number(c.price ?? c.hourlyRate ?? 0),
              image: c.avatarUrl || c.profileImage || `/placeholder.svg?height=400&width=320&query=${encodeURIComponent(Array.isArray(c.sports) && c.sports[0] ? c.sports[0] : 'coach')}`,
              featured: (String(c.rank || c.level || '').toLowerCase() === 'professional') || Number(c.rating ?? 0) >= 4.8,
              color: 'bg-green-100',
            }));

          if (mounted) setSimilarCoachesState(mapped);
        }
      } catch (err) {
        logger.error('Failed to fetch similar coaches', err);
      }
    };

    if (currentCoach) fetchSimilar();
    return () => { mounted = false; };
  }, [currentCoach?.id, dispatch]);



  // Trạng thái tải dữ liệu HLV
  if (detailLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loading size={48} className="text-green-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải thông tin huấn luyện viên...</p>
        </div>
      </div>
    );
  }

  // Trạng thái lỗi khi tải dữ liệu HLV
  if (detailError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Lỗi tải dữ liệu huấn luyện viên: {detailError.message}</p>
          <Button
            onClick={() => dispatch(getCoachById(effectiveCoachId ?? ""))}
          >
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  // Use real coach data from API only
  const coachData = currentCoach;
  const coachDisplayName = coachData?.name || (coachData as any)?.user?.fullName || "HLV";

  return (
    <>
      <NavbarDarkComponent />
      <PageWrapper className="bg-background">
        {/* Hero Background Section */}
        <div className="relative bg-[#1a2332] overflow-hidden h-[400px]">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="/badminton-player-action-shot-dark.jpg"
              alt="Background"
              className="w-full h-full object-cover opacity-40"
            />
            {/* Overlay solid thay vì gradient để giảm rối mắt */}
            <div className="absolute inset-0 bg-[#0b1020]/80" />
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 lg:px-8 -mt-48 relative z-20 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Left Column - Coach Info Card and Content Sections */}
            <div className="lg:col-span-2 space-y-6">
              {/* Coach Information Card */}
              <CoachInfoCard
                coachData={coachData}
                coachReviews={coachReviews}
                isFavourite={isFavourite}
                favLoading={favLoading}
                onToggleFavourite={toggleFavourite}
                onOpenChat={() => setShowCoachChat(true)}
              />

              {/* Navigation Tabs */}
              <CoachTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabClick={scrollToSection}
              />

              {/* Content Sections */}
              <div className="space-y-6">
                <BioSection coachData={coachData} />

                {/* <CoachingSection /> */}

                <GallerySection
                  images={galleryImages}
                  currentIndex={currentGalleryIndex}
                  onNext={nextGallerySlide}
                  onPrev={prevGallerySlide}
                />

                <ReviewsSection
                  coachData={coachData}
                  coachStats={coachStats}
                  coachReviews={coachReviews}
                  filteredReviews={filteredReviews}
                  reviewsLoading={reviewsLoading}
                  reviewsPage={reviewsPage}
                  reviewsTotalPages={reviewsTotalPages}
                  selectedRatingFilter={selectedRatingFilter}
                  onFilterChange={setSelectedRatingFilter}
                  onLoadMore={async (page: number) => {
                    if (reviewsLoading || page === reviewsPage) return;
                    await fetchReviews(page, false);
                  }}
                  onWriteReview={() => setShowReviewModal(true)}
                />

                {/* Location moved to sidebar */}
              </div>
            </div>

            {/* Right Column - Booking and Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6 animate-slide-in-right">
                <BookingCard
                  coachData={coachData}
                  onBookNow={handleBookNow}
                />

                <LocationSection
                  coachData={coachData}
                  currentCoach={currentCoach}
                  mapContainerRef={mapContainerRef}
                  mapRef={mapRef}
                  markerRef={markerRef}
                />
              </div>
            </div>
          </div>
        </div>

        <SimilarCoachesSection coaches={similarCoachesState.length ? similarCoachesState : similarCoaches} />

        {/* Modals */}
        <ReviewModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          coachName={coachData?.name || "HLV này"}
          reviewRating={reviewRating}
          hoveredRating={hoveredRating}
          reviewComment={reviewComment}
          isSubmitting={isSubmittingReview}
          onRatingChange={setReviewRating}
          onHoveredRatingChange={setHoveredRating}
          onCommentChange={setReviewComment}
          onSubmit={async (e) => {
            e.preventDefault();
            // Simple client-side validation
            if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
              return CustomFailedToast("Vui lòng chọn điểm đánh giá từ 1 đến 5");
            }
            if (!reviewComment || reviewComment.trim().length < 10) {
              return CustomFailedToast("Vui lòng nhập bình luận (tối thiểu 10 ký tự)");
            }

            setIsSubmittingReview(true);
            try {
              const payload = {
                type: "coach" as const,
                rating: reviewRating,
                comment: reviewComment.trim(),
                coachId: effectiveCoachId ?? "",
                bookingId: "",
              };

              const action: any = await dispatch(
                createCoachReviewThunk(payload as any)
              );

              if (action?.meta?.requestStatus === "fulfilled") {
                // reset and close
                setShowReviewModal(false);
                setReviewRating(0);
                setHoveredRating(0);
                setReviewComment("");

                CustomSuccessToast("Cảm ơn bạn — đánh giá đã được gửi.");
                // Refresh reviews and aggregated stats immediately after successful submission
                try {
                  await fetchReviews(1, false);
                } catch (err) {
                  logger.error('Failed to refresh reviews after submit', err);
                }
                try {
                  if (effectiveCoachId) {
                    // refresh aggregated stats stored in redux only —
                    // avoid fetching full coach entity to prevent full-page reload
                    await dispatch(getCoachStatsThunk(effectiveCoachId));
                  }
                } catch (err) {
                  logger.error('Failed to refresh coach stats after submit', err);
                }
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
                  setFlaggedWords(flaggedWords);
                  setShowProfanityAlert(true);
                } else {
                  CustomFailedToast(String(message));
                }
              }
            } catch (err: any) {
              const msg = err?.message || "Gửi đánh giá thất bại";
              // We check specific strings based on backend response
              if (String(msg).toLowerCase().includes('inappropriate') ||
                String(msg).toLowerCase().includes('profanity')) {
                setReviewError(String(msg));
                // Since generic catch might not have flaggedWords easily without parsing default err structure,
                // we just show the alert with the message.
                setShowProfanityAlert(true);
              } else {
                CustomFailedToast(msg);
              }
            } finally {
              setIsSubmittingReview(false);
            }
          }}
          onCancel={() => {
            setShowReviewModal(false);
            setReviewRating(0);
            setHoveredRating(0);
            setReviewError(null);
          }}
          errorMessage={reviewError}
          showProfanityAlert={showProfanityAlert}
          onProfanityAlertChange={setShowProfanityAlert}
          flaggedWords={flaggedWords}
        />

        {/* Coach Chat Popup */}
        <CoachDetailChatWindow
          isOpen={showCoachChat}
          onClose={() => setShowCoachChat(false)}
          coachId={String(effectiveCoachId || "")}
          coachName={coachDisplayName}
        />
      </PageWrapper>
    </>
  );
}
