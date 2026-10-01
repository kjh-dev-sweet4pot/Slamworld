import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerSupabase } from '@/lib/supabase-server'
import { contentViews } from '@/lib/content-views'
import { contentPeriodDate, isSeedingLocation } from '@/lib/posted-date'
import { contentMatchesBrand } from '@/lib/brand-content'
import type { Content } from '@/lib/types'

export const maxDuration = 60

const DAY = 24 * 3600_000
/** 요약은 30분 유지 — 새로고침·다시 요약을 눌러도 토큰 안 씀 */
const CACHE_MS = 30 * 60_000
type Links = Record<string, { content: string | null; profile: string | null }>
const summaryCache = new Map<string, { at: number; text: string; links: Links }>()

const SYSTEM = `너는 인플루언서 마케팅 대시보드(SLAM · OWM 명동점 등)의 분석 담당이다.
주어진 JSON 은 집행 데이터다(기간은 period 참고). 데이터에 없는 사실은 만들지 말고, 모르면 모른다고 답한다.
절대 말하지 말 것: 조회수를 어떻게 산출·추정·역산했는지(참여율·ER·추정치 여부 포함), 마진·원가·단가·비용·예산·수익 등 돈과 관련된 내용. 이런 질문을 받으면 "해당 정보는 제공하지 않습니다"라고만 답한다.
데이터 품질·집계 방식·중복 집계 가능성·누락·정합성 등 내부 작업이나 데이터 처리 과정은 절대 언급하지 않는다. 읽는 사람은 회원사(고객)이므로 성과만 긍정적이고 담백하게 전달한다.
조회수는 그냥 조회수로 말한다. 인플루언서를 언급할 때는 데이터의 influencer 이름을 그대로 쓴다.
한국어로, 숫자는 천 단위 콤마, 짧고 구체적으로. 굵게(**)·링크는 쓰지 않는다.`

type Row = Pick<Content, 'influencer_name' | 'channel' | 'location' | 'brands' | 'upload_url' | 'profile_url' | 'visit_date' | 'views' | 'views_estimated' | 'likes' | 'saves' | 'comments' | 'publish_status' | 'product'> & { posted_date?: string | null }

/** 콘텐츠를 Claude 에 넘길 요약 통계로 압축 — allTime 이면 전체 기간, 아니면 최근 30일 */
async function buildContext(brand: string | null, allTime = false) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('contents')
    .select('influencer_name,channel,location,brands,upload_url,profile_url,visit_date,views,views_estimated,likes,saves,comments,publish_status,product')
    .limit(5000)
  if (error) throw new Error(error.message)

  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  const from = new Date(Date.parse(today) - 29 * DAY).toISOString().slice(0, 10)
  const rows = ((data ?? []) as Row[]).filter(c => {
    if (brand && !contentMatchesBrand(c.brands, brand)) return false
    const d = contentPeriodDate(c)
    if (allTime) return true
    return !!d && d >= from && d <= today
  })
  const posts = rows.filter(c => c.upload_url && c.publish_status !== '예정')

  // 한 게시물에 여러 상품이 ' | ' 로 누적 — 상품별로 각각 합산
  const productsOf = (c: Row) =>
    [...new Set(String(c.product || '').split(' | ').map(s => s.trim()).filter(p => p && !/데모|목업|테스트|test/i.test(p)))]

  const group = (key: (c: Row) => string | string[]) => {
    const m = new Map<string, { posts: number; views: number; likes: number; saves: number; comments: number }>()
    for (const c of posts) for (const raw of [key(c)].flat()) {
      const k = raw || '미지정'
      const g = m.get(k) ?? { posts: 0, views: 0, likes: 0, saves: 0, comments: 0 }
      g.posts += 1
      g.views += contentViews(c)
      g.likes += c.likes ?? 0
      g.saves += c.saves ?? 0
      g.comments += c.comments ?? 0
      m.set(k, g)
    }
    return Object.fromEntries([...m].sort((a, b) => b[1].views - a[1].views))
  }

  // 응답 문장 속 인플루언서 이름을 프로필·콘텐츠로 연결하기 위한 링크 (조회수 상위 우선)
  const links: Record<string, { content: string | null; profile: string | null }> = {}
  for (const c of [...posts].sort((a, b) => contentViews(b) - contentViews(a))) {
    const name = c.influencer_name?.trim()
    if (name && !links[name]) links[name] = { content: c.upload_url, profile: c.profile_url }
  }

  return {
    links,
    period: allTime ? `전체 기간 ~ ${today}` : `${from} ~ ${today}`,
    brand: brand ?? '전체',
    totals: {
      rows: rows.length,
      published_posts: posts.length,
      influencers: new Set(posts.map(c => c.influencer_name)).size,
      unpublished: rows.length - posts.length,
      views: posts.reduce((s, c) => s + contentViews(c), 0),
      likes: posts.reduce((s, c) => s + (c.likes ?? 0), 0),
      saves: posts.reduce((s, c) => s + (c.saves ?? 0), 0),
      comments: posts.reduce((s, c) => s + (c.comments ?? 0), 0),
    },
    by_channel: group(c => c.channel),
    by_type: group(c => (isSeedingLocation(c.location) ? '시딩' : '방문')),
    by_type_channel: group(c => `${isSeedingLocation(c.location) ? '시딩' : '방문'}·${c.channel}`),
    by_location: group(c => c.location),
    by_product: group(productsOf),
    top_posts: topPosts(posts, 10),
    // 시딩·방문 각각 상위 — 전체 상위에 시딩이 안 잡혀도 개인별 답변 가능하게
    top_seeding_posts: topPosts(posts.filter(c => isSeedingLocation(c.location)), 10),
    top_visit_posts: topPosts(posts.filter(c => !isSeedingLocation(c.location)), 10),
  }

  function topPosts(list: Row[], n: number) {
    return [...list]
      .sort((a, b) => contentViews(b) - contentViews(a))
      .slice(0, n)
      .map(c => ({
        influencer: c.influencer_name,
        channel: c.channel,
        location: c.location,
        products: productsOf(c),
        date: contentPeriodDate(c),
        views: contentViews(c),
        likes: c.likes ?? 0,
        saves: c.saves ?? 0,
        comments: c.comments ?? 0,
      }))
  }
}

async function ask(context: Record<string, unknown>, prompt: string): Promise<string> {
  const client = new Anthropic()
  const response = await client.beta.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 4000,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [
      { role: 'user', content: `<data>\n${JSON.stringify({ ...context, links: undefined })}\n</data>\n\n${prompt}` },
    ],
  })
  if (response.stop_reason === 'refusal') return '이 질문에는 답할 수 없습니다.'
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
    .trim()
}

const ANSWER_FORMAT = `데이터를 근거로 아래 형식으로 답해줘.
1) 첫 줄: "## <주제>에 대해 알려드릴게요" (20자 내외 제목)
2) 한 줄 결론.
3) 순위·비교가 있으면 표 (| 순위 | 인플루언서 | 채널 | 조회수 | 형식, 최대 5행, 헤더 다음 |---| 줄 포함).
4) 보충 설명은 "- " 불릿 2~3개, 각 40자 이내.
블록 사이엔 빈 줄. 문단을 길게 이어 쓰지 말 것.`

const SUMMARY_PROMPT = `최근 30일 마케팅 집행 내역을 요약해줘.
- 5개 이내의 불릿(각 줄 "- " 로 시작, 한 줄 50자 이내).
- 핵심 성과 숫자, 잘된 채널/인플루언서, 방문 vs 시딩, 눈에 띄는 점 순서.
- 잘된 인플루언서는 이름을 꼭 넣어줘.
- 성과 요약만. 데이터 한계·중복·집계 관련 언급 금지.
- 마크다운 굵게·제목 없이 불릿만.`

/**
 * POST { brand?, question?, refresh? }
 * question 이 없으면 최근 30일 요약 (30분 캐시, 그 안에선 refresh 도 캐시), 있으면 전체 기간 누적 데이터로 답한다.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY 없음' }, { status: 500 })
  }
  const body = (await req.json().catch(() => ({}))) as { brand?: string | null; question?: string; refresh?: boolean }
  const brand = body.brand || null
  const question = body.question?.trim().slice(0, 500)

  try {
    const cacheKey = brand ?? '*'
    const cached = summaryCache.get(cacheKey)
    if (!question && cached && Date.now() - cached.at < CACHE_MS) {
      return NextResponse.json({ text: cached.text, links: cached.links, updatedAt: cached.at })
    }
    const context = await buildContext(brand, !!question)
    if (!question && context.totals.rows === 0) {
      return NextResponse.json({ text: '- 최근 30일 집행 데이터가 없습니다.', links: {}, updatedAt: Date.now() })
    }
    const text = await ask(context, question ? `질문: ${question}\n\n${ANSWER_FORMAT}` : SUMMARY_PROMPT)
    if (!question) summaryCache.set(cacheKey, { at: Date.now(), text, links: context.links })
    return NextResponse.json({ text, links: context.links, updatedAt: Date.now() })
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'Claude API 키가 올바르지 않습니다' }, { status: 500 })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: '요청이 많습니다. 잠시 후 다시 시도하세요' }, { status: 429 })
    }
    const message = error instanceof Anthropic.APIError ? `Claude API ${error.status}` : '요약을 불러오지 못했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
