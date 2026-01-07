import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface CheckInCountdownProps {
    targetTime: Date
    onCountdownComplete?: () => void
    className?: string
}

export function CheckInCountdown({ targetTime, onCountdownComplete, className = '' }: CheckInCountdownProps) {
    const [timeRemaining, setTimeRemaining] = useState<number>(0)
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = new Date().getTime()
            const target = new Date(targetTime).getTime()
            const difference = target - now

            if (difference <= 0) {
                setIsComplete(true)
                setTimeRemaining(0)
                onCountdownComplete?.()
                return 0
            }

            return difference
        }

        // Initial calculation
        const initial = calculateTimeRemaining()
        setTimeRemaining(initial)

        // Update every second
        const interval = setInterval(() => {
            const remaining = calculateTimeRemaining()
            setTimeRemaining(remaining)
        }, 1000)

        return () => clearInterval(interval)
    }, [targetTime, onCountdownComplete])

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60

        return {
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0'),
        }
    }

    if (isComplete) {
        return (
            <div className={`flex items-center gap-2 text-green-600 ${className}`}>
                <Clock className="w-5 h-5" />
                <span className="font-semibold">Đã đến giờ nhận sân!</span>
            </div>
        )
    }

    const { minutes, seconds } = formatTime(timeRemaining)

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Thời gian còn lại để tạo mã:</span>
            </div>
            <div className="flex gap-2 items-center">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-center min-w-[60px]">
                    <div className="text-2xl font-bold text-gray-900">{minutes}</div>
                    <div className="text-xs text-gray-500">phút</div>
                </div>
                <span className="text-2xl font-bold text-gray-400">:</span>
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-center min-w-[60px]">
                    <div className="text-2xl font-bold text-gray-900">{seconds}</div>
                    <div className="text-xs text-gray-500">giây</div>
                </div>
            </div>
        </div>
    )
}
