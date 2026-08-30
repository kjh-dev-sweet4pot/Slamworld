import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OWM × 브랜드슬램 인플루언서 리포트',
  description: '캠페인 성과 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {/* 배경 orb */}
        <div aria-hidden className="pointer-events-none">
          <div className="orb" style={{
            width:'50vw',height:'50vw',background:'#8FD0FF',
            top:'-16vw',left:'-8vw',zIndex:0
          }}/>
          <div className="orb" style={{
            width:'42vw',height:'42vw',background:'#2F7BF0',
            top:'32vw',right:'-14vw',opacity:.24,zIndex:0
          }}/>
          <div className="orb" style={{
            width:'38vw',height:'38vw',background:'#BFE3FF',
            bottom:'-14vw',left:'30vw',opacity:.42,zIndex:0
          }}/>
          <div style={{
            position:'fixed',inset:0,zIndex:1,pointerEvents:'none',opacity:.3,
            backgroundImage:'radial-gradient(rgba(10,31,60,.055) 1px,transparent 1px)',
            backgroundSize:'22px 22px'
          }}/>
        </div>
        <div style={{ position:'relative', zIndex:2 }}>
          {children}
        </div>
      </body>
    </html>
  )
}
