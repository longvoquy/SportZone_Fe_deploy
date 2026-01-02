import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type GeneralErrorProps = React.HTMLAttributes<HTMLDivElement> & {
    minimal?: boolean
}

export default function GeneralError({
    className,
    minimal = false,
}: GeneralErrorProps) {
    const navigate = useNavigate()

    return (
        <div className={cn('h-svh w-full', className)}>
            <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
                {!minimal && (
                    <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
                )}
                <span className='font-medium'>Rất tiếc! Đã xảy ra lỗi</span>
                <p className='text-muted-foreground text-center'>
                    Xin lỗi vì sự bất tiện. <br /> Vui lòng thử lại sau.
                </p>
                {!minimal && (
                    <div className='mt-6 flex gap-4'>
                        <Button variant='outline' onClick={() => navigate(-1)}>
                            Quay lại
                        </Button>
                        <Button onClick={() => navigate('/')}>Về trang chủ</Button>
                    </div>
                )}
            </div>
        </div>
    )
}
