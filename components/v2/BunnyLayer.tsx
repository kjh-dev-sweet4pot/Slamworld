'use client'

/** 배경에서 깡충 뛰어다니는 토끼. 카드 뒤에 깔리고, 인쇄·움직임 줄이기 설정에선 숨긴다 */
const BUNNIES = Array.from({ length: 15 }, (_, i) => ({
  top: `${4 + i * 6.5}%`,
  dur: 14 + ((i * 7) % 13),
  delay: (i * 11) % 20,
  rev: i % 2 === 1,
}))

export default function BunnyLayer() {
  return (
    <div aria-hidden className="bunny-layer pointer-events-none absolute inset-0 overflow-hidden z-0 print:hidden">
      {BUNNIES.map((b, i) => (
        <div
          key={i}
          className={`bunny${b.rev ? ' bunny-rev' : ''}`}
          style={{ top: b.top, animationDuration: `${b.dur}s`, animationDelay: `-${b.delay}s` }}
        >
          <span>🐇</span>
        </div>
      ))}
    </div>
  )
}
