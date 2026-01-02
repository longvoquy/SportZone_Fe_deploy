import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundError() {
    const navigate = useNavigate()
    return (
        <div className='h-svh'>
            <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
                <h1 className='text-[7rem] leading-tight font-bold'>404</h1>
                <span className='font-medium'>Rất tiếc! Không tìm thấy trang!</span>
                <p className='text-muted-foreground text-center'>
                    Có vẻ trang bạn tìm kiếm không tồn tại <br />
                    hoặc đã bị xoá.
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
