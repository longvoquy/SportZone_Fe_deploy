import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSportDisplayNameVN } from "@/components/enums/ENUMS";

interface BioSectionProps {
  coachData: any;
}

export const BioSection: React.FC<BioSectionProps> = ({ coachData }) => {
  const rawSports = coachData?.sports ?? coachData?.coachingDetails?.sports ?? '';
  const sportsList: string[] = Array.isArray(rawSports)
    ? rawSports.map((s: any) => (typeof s === 'string' ? s : s?.label ?? s?.name ?? String(s)))
    : typeof rawSports === 'string' && rawSports.trim()
    ? rawSports.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  return (
    <Card
      id="bio"
      className="shadow-md hover:shadow-lg transition-all duration-300 scroll-mt-24"
    >
      <CardHeader>
        <CardTitle className="text-xl text-left">Giới thiệu ngắn</CardTitle>
        <hr className="my-2 border-gray-200" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p className="text-left">
            <span className="font-semibold">Họ và tên:</span> {coachData?.name ?? "-"}
          </p>
          <p className="text-left">
            <span className="font-semibold">Kinh nghiệm:</span> {coachData?.coachingDetails?.experience ?? "-"}
          </p>
          <p className="text-left">
            <span className="font-semibold">Chứng chỉ:</span> {coachData?.coachingDetails?.certification ?? "-"}
          </p>
          <p className="text-left">
            <span className="font-semibold">Chuyên môn:</span> {sportsList && sportsList.length > 0 ? (
              <span className="inline-flex flex-wrap gap-2">
                {sportsList.map((s) => (
                  <span key={s} className="px-2 py-1 bg-muted rounded-full text-sm">
                    {getSportDisplayNameVN(s)}  
                  </span>
                ))}
              </span>
            ) : (
              "-"
            )}
          </p>
        </div>
        <Button
          variant="link"
          className="text-green-600 hover:text-green-700 p-0 h-auto"
        >
          Xem thêm
        </Button>
      </CardContent>
    </Card>
  );
};

