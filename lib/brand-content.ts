import type { Content } from '@/lib/types'

/** 예산 브랜드명 → contents.brands 필드 매칭용 */
export const BRAND_CONTENT_ALIASES: Record<string, string[]> = {
  'TeloAct': ['텔로엑트', 'TeloAct', '텔로'],
  '닥터 리앤장': ['닥터리엔장', '닥터 리앤장', '리엔장'],
  '옵티팜': ['옵티팜'],
  '클리어디어': ['클리어디어', '클리어'],
  'Rxme': ['Rxme', 'rxme'],
  '해브블루': ['해브블루', '해브'],
  '스킨스탠다드': ['스킨스탠다드', '스킨'],
}

export function contentMatchesBrand(brands: string | null | undefined, brand: string): boolean {
  if (!brands) return false
  const aliases = BRAND_CONTENT_ALIASES[brand] ?? [brand]
  const parts = brands.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
  return aliases.some(alias =>
    parts.some(p => p === alias || p.includes(alias) || alias.includes(p)),
  )
}

export function contentsForBrand(all: Content[], brand: string): Content[] {
  return all
    .filter(c => contentMatchesBrand(c.brands, brand))
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
}
