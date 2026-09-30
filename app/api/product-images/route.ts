import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface ProductInfo {
  image?: string
  company?: string
  /** 화면 표기: '[회원사] 제품명'. 회사 대표 상품(사진 없음)은 그 회사 실제 제품들로 펼친다 */
  label?: string
}

/**
 * 보딩패스 상품 정보 — { 상품명: { image, company } }.
 * 이미지는 image_url 또는 content-files 버킷 경로 서명. 없으면 같은 회원사 상품 사진으로 대체한다.
 */
export async function GET() {
  const url = process.env.BP_SUPABASE_URL
  const key = process.env.BP_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'BoardingPass 환경변수 없음' }, { status: 500 })

  const bp = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await bp
    .from('products')
    .select('name,image_url,image_path,companies(name)')
    .order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as {
    name: string | null
    image_url: string | null
    image_path: string | null
    companies: { name: string | null } | null
  }[]
  const info: Record<string, ProductInfo> = {}
  const companyImage = new Map<string, string>()
  for (const p of rows) {
    if (!p.name) continue
    let image = p.image_url || undefined
    if (!image && p.image_path) {
      const { data: signed } = await bp.storage.from('content-files').createSignedUrl(p.image_path, 60 * 60 * 24)
      image = signed?.signedUrl
    }
    const company = p.companies?.name || undefined
    if (image && company && !companyImage.has(company)) companyImage.set(company, image)
    const prev = info[p.name]
    info[p.name] = { image: prev?.image || image, company: prev?.company || company }
  }
  // 회사별 실제 제품(사진 있는 것) 목록
  const companyProducts = new Map<string, string[]>()
  for (const [name, v] of Object.entries(info)) {
    if (!v.image || !v.company) continue
    const list = companyProducts.get(v.company) ?? []
    list.push(name.replace(/\s+-\s+[^-]+$/, '').trim())
    companyProducts.set(v.company, list)
  }
  // 동기화가 회사 미지정 공용 상품을 회사명으로 바꿔 저장한다 → 회사명 키도 대표 상품으로 등록
  const { data: companyRows } = await bp.from('companies').select('name')
  const companyNames = [...rows.map(p => p.companies?.name), ...(companyRows ?? []).map(c => c.name as string | null)]
  for (const company of new Set(companyNames.filter((c): c is string => !!c))) {
    if (!info[company]) info[company] = { company }
  }
  for (const [name, v] of Object.entries(info)) {
    if (!v.company) continue
    const real = companyProducts.get(v.company)
    // 사진 없는 대표 상품(예: '닥터리앤장') → 같은 회사 실제 제품들
    const placeholder = !v.image && !!real?.length
    const shown = placeholder
      ? [...new Set(real)].join(' · ')
      : name === v.company
        ? `${name} 제품` // 등록된 제품 사진이 없는 회사
        : name.replace(/\s+-\s+[^-]+$/, '').trim()
    v.label = `[${v.company}] ${shown}`
    if (!v.image) v.image = companyImage.get(v.company)
  }
  return NextResponse.json(info, { headers: { 'Cache-Control': 'no-store' } })
}
