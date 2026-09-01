/** 체험단 비용 (만원, 100~120 · 10만원 단위) — 성과 상단·명동 핵심 인원 */
const FEE_TARGETS = new Set([
  '娜美Nami',
  '不吃酥饼',
  '踢踢',
  '予乐',
  'pada_heli',
  '珊珊来了',
  'Nancy菜团子',
  '리즈',
  'Chelsie Alquinto',
  '홍수아',
  'luna_pro_beauty',
  'Nesterova Anastasia',
])
const FEE_STEPS = [100, 110, 120] as const

function hashName(name: string): number {
  let h = 0
  for (const ch of name) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return Math.abs(h)
}

export function influencerFeeManwon(name: string): number | null {
  if (!FEE_TARGETS.has(name)) return null
  return FEE_STEPS[hashName(name) % FEE_STEPS.length]
}

// ponytail: smoke
if (process.env.NODE_ENV !== 'production') {
  for (const n of FEE_TARGETS) {
    const v = influencerFeeManwon(n)
    if (!v || v < 100 || v > 120 || v % 10 !== 0) {
      throw new Error(`influencer-fee self-check failed: ${n}=${v}`)
    }
  }
}
