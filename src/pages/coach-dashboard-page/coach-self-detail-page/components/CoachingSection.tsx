import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface CoachingSectionProps {
  coachingSummary: string;
  isEditMode: boolean;
  onCoachingSummaryChange: (value: string) => void;
  certification?: string;
  experienceText?: string;
  onCertificationChange?: (value: string) => void;
  onExperienceChange?: (value: string) => void;
  rank?: string;
  sports?: string;
  onRankChange?: (value: string) => void;
  onSportsChange?: (value: string) => void;
}

export function CoachingSection({
  isEditMode,
  certification,
  experienceText,
  onCertificationChange,
  onExperienceChange,
  rank,
  sports,
  onRankChange,
  onSportsChange,
}: CoachingSectionProps) {
  const [cert, setCert] = useState<string>(certification ?? "");
  const [exp, setExp] = useState<string>(experienceText ?? "");
  const [localRank, setLocalRank] = useState<string>(rank ?? "");
  const [localSport, setLocalSport] = useState<string>(sports ?? "");

  useEffect(() => {
    setCert(certification ?? "");
  }, [certification]);

  useEffect(() => {
    setExp(experienceText ?? "");
  }, [experienceText]);
  useEffect(() => {
    setLocalRank(rank ?? "");
  }, [rank]);
  useEffect(() => {
    setLocalSport(sports ?? "");
  }, [sports]);
  return (
    <Card
      id="coaching"
      className="shadow-md hover:shadow-lg transition-all duration-300 scroll-mt-24"
    >
      <CardHeader>
        <CardTitle className="text-xl text-left">
          Tóm tắt về huấn luyện viên
        </CardTitle>
        <hr className="my-2 border-gray-200" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="mt-0 space-y-4 text-left">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="font-bold text-sm w-36">Certification:</label>
              {isEditMode ? (
                <Input
                  value={cert}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCert(v);
                    if (typeof (onCertificationChange as any) === "function") (onCertificationChange as any)(v);
                  }}
                  placeholder="ITF Level 3 Coach"
                />
              ) : (
                <span className="text-sm">{certification ?? "Không có"}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="font-bold text-sm w-36">Experience:</label>
              {isEditMode ? (
                <Input
                  value={exp}
                  onChange={(e) => {
                    const v = e.target.value;
                    setExp(v);
                    if (typeof (onExperienceChange as any) === "function") (onExperienceChange as any)(v);
                  }}
                  placeholder="10 years coaching experience"
                />
              ) : (
                <span className="text-sm">{experienceText ?? "Chưa cập nhật"}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="font-bold text-sm w-36">Rank:</label>
              {isEditMode ? (
                <select
                  value={localRank}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalRank(v);
                    if (typeof onRankChange === 'function') onRankChange(v);
                  }}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Select rank</option>
                  <option value="novice">Novice</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="pro">Pro</option>
                </select>
              ) : (
                <span className="text-sm">{rank ?? "-"}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="font-bold text-sm w-36">Sport:</label>
              {isEditMode ? (
                <select
                  value={localSport}
                  onChange={(e) => {
                    const v = e.target.value;
                    setLocalSport(v);
                    if (typeof onSportsChange === 'function') onSportsChange(v);
                  }}
                  className="border rounded px-2 py-1"
                >
                  <option value="">Select sport</option>
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="tennis">Tennis</option>
                  <option value="badminton">Badminton</option>
                  <option value="swimming">Swimming</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="pickleball">Pickleball</option>
                  <option value="gym">Gym</option>
                </select>
              ) : (
                <span className="text-sm capitalize">{sports || '-'}</span>
              )}
            </div>
          </div>
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
}

