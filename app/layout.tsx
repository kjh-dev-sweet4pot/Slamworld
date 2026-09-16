import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SLAM 인플루언서 리포트 v2.0.0',
  description: '캠페인 성과 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-owm-bg text-owm-text antialiased text-[13px] leading-relaxed">
        {children}
      </body>
    </html>
  )
}
