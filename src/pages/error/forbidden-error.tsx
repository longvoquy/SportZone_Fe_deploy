import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function ForbiddenError() {
    const navigate = useNavigate()
    return (
        <div className='h-svh'>
            <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
                <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
                <span className='font-medium'>Truy cập bị từ chối</span>
                <p className='text-muted-foreground text-center'>
                    Bạn không có quyền truy cập <br />
                    để xem nội dung này.
                </p>
                <div className='mt-6 flex gap-4'>
                    <Button variant='outline' onClick={() => navigate(-1)}>
                        Quay lại
                    </Button>
                    <Button onClick={() => navigate('/')}>Về trang chủ</Button>
                </div>
            </div>
        </div>
    )
}
