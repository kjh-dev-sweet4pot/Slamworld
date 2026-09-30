import type { Content, ContentFormat } from '@/lib/types'

/**
 * 콘텐츠 형식 자동 분류. DB에 수동 지정된 content_format이 있으면 그 값을 우선한다.
 * 없으면 채널·업로드 링크 패턴으로 추론한다.
 *   샤오홍슈            → 노트
 *   인스타그램 (릴스 링크) → 릴스
 *   인스타그램 (그 외)   → 게시물
 *   틱톡 · 도우인        → 숏폼
 *   웨이보 · 그 외       → 게시물
 * 업로드 전(upload_url 없음)이면 null.
 */
export function classifyContentFormat(
  c: Pick<Content, 'channel' | 'upload_url' | 'content_format'>,
): ContentFormat | null {
  if (c.content_format) return c.content_format
  if (!c.upload_url) return null

  if (c.channel === '샤오홍슈') return '노트'
  if (c.channel === '인스타그램') {
    return /\/reels?\//i.test(c.upload_url) ? '릴스' : '게시물'
  }
  if (c.channel === '틱톡' || c.channel === '도우인') return '숏폼'
  return '게시물'
}

export const CONTENT_FORMAT_LABEL: Record<ContentFormat, { emoji: string; sub: string; color: string }> = {
  '릴스':   { emoji: '🎬', sub: '인스타그램 릴스',     color: '#8b5cf6' },
  '노트':   { emoji: '🖼️', sub: '샤오홍슈 이미지 피드', color: '#e03131' },
  '숏폼':   { emoji: '📱', sub: '틱톡 · 도우인',        color: '#06b6d4' },
  '게시물': { emoji: '🗂️', sub: '인스타 피드 · 웨이보', color: '#64748b' },
}
