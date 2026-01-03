import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Calendar, Eye } from "lucide-react";

interface SimilarCoach {
  id?: string;
  name: string;
  avatar?: string;
  sport: string;
  location: string;
  rating: number;
  reviews: number;
  sessions: number;
  availability: string;
  price: number;
  image: string;
  featured: boolean;
  color: string;
}

interface SimilarCoachesSectionProps {
  coaches: SimilarCoach[];
}

export const SimilarCoachesSection: React.FC<SimilarCoachesSectionProps> = ({
  coaches,
}) => {
  const navigate = useNavigate();
  return (
    <div className="bg-muted/30 py-16 mt-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">Huấn luyện viên tương tự</h2>
          <Button
            variant="outline"
            className="hover:bg-white bg-transparent"
            onClick={() => navigate('/coach')}
          >
            Xem tất cả HLV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coaches.map((coach, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 animate-fade-in-up bg-white"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Coach Image with Overlays */}
              <div className="relative aspect-4/3 overflow-hidden">
                <img
                  src={
                    coach.avatar ||
                    coach.image ||
                    "/placeholder.svg?height=400&width=320&query=professional coach portrait"
                  }
                  alt={coach.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Top badges */}
                <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                  <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white border-0 font-semibold">
                    {coach.featured ? "Professional" : "Rookie"}
                  </Badge>
                  {/* <Button
                    size="icon"
                    variant="secondary"
                    className="rounded-full bg-white/90 hover:bg-white hover:text-red-500 transition-colors h-9 w-9"
                  >
                    <Heart className="h-4 w-4" />
                  </Button> */}
                </div>

                {/* Nhãn giá ở dưới */}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-[#1a2332] hover:bg-[#1a2332]/90 text-white border-0 px-3 py-1.5 text-sm font-semibold">
                    Từ {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(coach.price)}/giờ
                  </Badge>
                </div>
              </div>

              {/* Card Content */}
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-green-600 transition-colors mb-1">
                    {coach.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{coach.location}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Certified badminton coach with a deep understanding of the
                  sport's and strategies game.
                </p>

                {/* Nút hành động */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 font-semibold"
                    onClick={() => {
                      if (coach.id) navigate(`/coach/${coach.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Xem hồ sơ
                  </Button>
                  {/* <Button className="flex-1 bg-[#1a2332] hover:bg-[#1a2332]/90 text-white font-semibold">
                    <Calendar className="h-4 w-4 mr-2" />
                    Đặt ngay
                  </Button> */}
                </div>
              </CardContent>

              {/* Chân thẻ */}
              <CardFooter className="flex items-center justify-between border-t pt-4 pb-4 px-6 bg-muted/20">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Chuyên môn
                    </div>
                    <div className="text-xs font-semibold">
                      {coach.sport}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="bg-yellow-500 p-1.5 rounded">
                    <Star className="h-3.5 w-3.5 text-white fill-white" />
                  </div>
                  <span className="font-semibold">
                    {coach.reviews} đánh giá
                  </span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

