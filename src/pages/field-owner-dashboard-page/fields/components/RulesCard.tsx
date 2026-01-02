import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface RulesCardProps {
  refObj: React.RefObject<HTMLDivElement | null>
  id: string
  rules: string[]
}

export const RulesCard: React.FC<RulesCardProps> = ({ refObj, id, rules }) => {
  return (
    <Card ref={refObj as any} id={id} className="shadow-md border-0 bg-white">
      <CardHeader>
        <CardTitle className="text-base md:text-lg">Nội quy</CardTitle>
      </CardHeader>
      <hr className="border-t border-gray-300 my-0 mx-6" />
      <CardContent>
        {rules.length > 0 ? (
          <ul className="space-y-2">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-3 text-gray-700">
                <div className="shrink-0 w-5 h-5 rounded-full  flex items-center justify-center">
                  <AlertCircle className="w-3 h-3 text-red-500" />
                </div>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Chưa cập nhật nội quy.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default RulesCard


