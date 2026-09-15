import type { Content } from '@/lib/types'

/** 예산 브랜드명 → contents.brands 필드 매칭용 */
export const BRAND_CONTENT_ALIASES: Record<string, string[]> = {
  'TeloAct': ['텔로엑트', 'TeloAct', '텔로'],
  '닥터 리앤장': ['닥터리앤장', '닥터리엔장', '닥터 리앤장', '리엔장'],
  '옵티팜': ['옵티팜'],
  '클리어디어': ['클리어디어', '클리어'],
  'Rxme': ['Rxme', 'rxme'],
  'Troubleless': ['Troubleless', '트러블리스', '트러블레스'],
  'UIQ': ['UIQ', '유아이큐', '유이크'],
  '헤브블루': ['헤브블루', '해브블루', 'Heveblue', 'Haveblue', '해브', '헤브'],
  '달바': ['달바', 'dalba'],
  '스킨스탠다드': ['스킨스탠다드', '스킨'],
  '리포데이': ['리포데이', 'Re4day', 're4day'],
  '토코보': ['토코보', 'Tocobo', 'tocobo'],
}

/** 콘텐츠 성과 필터용 브랜드 목록 */
export const CONTENT_FILTER_BRANDS = Object.keys(BRAND_CONTENT_ALIASES)

export function canonicalBrand(name: string): string {
  if (BRAND_CONTENT_ALIASES[name]) return name
  const key = name.trim().toLowerCase()
  const hit = Object.entries(BRAND_CONTENT_ALIASES).find(([, aliases]) =>
    aliases.some(a => a.toLowerCase() === key),
  )
  return hit?.[0] ?? name
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
