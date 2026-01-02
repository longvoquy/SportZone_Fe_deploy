import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface OverviewCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  description: string
}

export const OverviewCard: React.FC<OverviewCardProps> = ({ refObj, id, description }) => {
  return (
    <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Tổng quan</CardTitle>
      </CardHeader>
      <hr className="border-t border-gray-300 my-0 mx-6" />
      <CardContent className="pt-6">
        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

export default OverviewCard


