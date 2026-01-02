import React, { useState, useRef, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ImageModal } from "@/components/ui/image-modal"

interface GalleryCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  images: string[]
  fallback: string[]
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ refObj, id, images, fallback }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)

  const displayImages = images.length > 0 ? images : fallback
  const placeholderImg = "/general-img-portrait.png"

  // Responsive: mobile 1, tablet 2, desktop 3
  const getItemsPerView = () => {
    if (viewportWidth === 0) return 1
    if (viewportWidth < 640) return 1 // mobile
    if (viewportWidth < 1024) return 2 // tablet
    return 3 // desktop
  }

  useEffect(() => {
    const update = () => {
      if (viewportRef.current) {
        setViewportWidth(viewportRef.current.clientWidth)
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  // Reset currentIndex when itemsPerView changes (e.g., on resize)
  useEffect(() => {
    const itemsPerView = Math.min(displayImages.length, getItemsPerView())
    const maxIndex = Math.max(0, displayImages.length - itemsPerView)
    setCurrentIndex((prev) => (prev > maxIndex ? maxIndex : prev))
  }, [viewportWidth, displayImages.length])

  const itemsPerView = Math.min(displayImages.length, getItemsPerView())
  const gapPx = 12
  const itemWidthPx = viewportWidth > 0 && itemsPerView > 0 
    ? Math.floor((viewportWidth - gapPx * (itemsPerView - 1)) / itemsPerView) 
    : viewportWidth || 300

  const maxIndex = Math.max(0, displayImages.length - itemsPerView)

  const handlePrev = () => {
    if (displayImages.length <= itemsPerView) return
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : maxIndex))
  }

  const handleNext = () => {
    if (displayImages.length <= itemsPerView) return
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : 0))
  }

  const handleImageClick = (index: number) => {
    setModalIndex(index)
    setIsModalOpen(true)
  }

  const canNavigate = displayImages.length > itemsPerView

  return (
    <>
      <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Thư viện ảnh</CardTitle>
        </CardHeader>
        <hr className="border-t border-gray-300 my-0 mx-6" />
        <CardContent className="pt-6">
              {displayImages.length > 0 ? (
                <div 
                  ref={viewportRef}
                  className="relative w-full overflow-hidden rounded-lg"
                >
                  <div
                    ref={carouselRef}
                    className="flex gap-3 transition-transform duration-300 ease-in-out"
                    style={{
                      transform: `translateX(-${currentIndex * (itemWidthPx + gapPx)}px)`,
                    }}
                  >
                    {displayImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex-none cursor-pointer group"
                        style={{ width: itemWidthPx ? `${itemWidthPx}px` : '100%' }}
                        onClick={() => handleImageClick(idx)}
                      >
                        <div className="relative overflow-hidden rounded-md aspect-square bg-gray-100">
                          <img
                            src={img || placeholderImg}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            alt={`Ảnh ${idx + 1}`}
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = placeholderImg
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {canNavigate && (
                    <>
                      <button
                        aria-label="Ảnh trước"
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg border z-10 transition-opacity"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        aria-label="Ảnh tiếp"
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg border z-10 transition-opacity"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {displayImages.length > itemsPerView && (
                    <div className="flex justify-center gap-1 mt-4">
                      {Array.from({ length: Math.ceil(displayImages.length / itemsPerView) }).map((_, idx) => {
                        const slideStartIndex = idx * itemsPerView
                        const isActive = currentIndex >= slideStartIndex && currentIndex < slideStartIndex + itemsPerView
                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentIndex(Math.min(slideStartIndex, maxIndex))}
                            className={`h-2 rounded-full transition-all ${
                              isActive
                                ? 'w-8 bg-primary'
                                : 'w-2 bg-gray-300 hover:bg-gray-400'
                            }`}
                            aria-label={`Đi tới slide ${idx + 1}`}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Chưa có ảnh nào
                </div>
              )}
        </CardContent>
      </Card>

      <ImageModal
        images={displayImages}
        currentIndex={modalIndex}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Thư viện ảnh"
        altTextPrefix="Ảnh"
        showNavigation={displayImages.length > 1}
        showThumbnails={displayImages.length > 1}
      />
    </>
  )
}

export default GalleryCard


