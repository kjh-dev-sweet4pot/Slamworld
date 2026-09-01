'use client'
import type { CSSProperties } from 'react'
import type { Content } from '@/lib/types'
import { contentViews } from '@/lib/content-views'
import { LOC_COLOR, RANK_ACCENTS } from '@/lib/feed-items'

type Metric = 'likes' | 'views'

const CHANNEL_SHORT: Record<string, string> = {
  '샤오홍슈': '샤오홍슈',
  '인스타그램': '인스타',
  '틱톡': '틱톡',
  '도우인': '도우인',
  '웨이보': '웨이보',
}

function metricValue(c: Content, metric: Metric): number {
  if (metric === 'likes') return c.likes ?? 0
  return contentViews(c)
}

function fmtMetric(n: number, metric: Metric): string {
  if (n <= 0) return '—'
  if (metric === 'views' && n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function SideTopCard({
  title,
  emoji,
  sub,
  metric,
  items,
}: {
  title: string
  emoji: string
  sub: string
  metric: Metric
  items: Content[]
}) {
  const top = [...items]
    .filter(c => metricValue(c, metric) > 0)
    .sort((a, b) => metricValue(b, metric) - metricValue(a, metric))
    .slice(0, 3)

  return (
    <div className="owm-b3-card">
      <div className="owm-b3-head">
        <div className="owm-b3-title">
          <span>{emoji}</span>
          <span>{title}</span>
          <span className="sub">{sub}</span>
        </div>
      </div>
      <div className="owm-b3-body">
        {top.length === 0 ? (
          <div className="owm-b3-empty">데이터가 없습니다.</div>
        ) : top.map((c, i) => {
          const acc = RANK_ACCENTS[i] ?? '#94a3b8'
          const locColor = LOC_COLOR[c.location] ?? '#94a3b8'
          const val = metricValue(c, metric)
          const linkable = !!c.upload_url
          const row = (
            <div className="owm-b3-row">
              <span className="owm-b3-rank" style={{ background: acc }}>{i + 1}</span>
              <div className="owm-b3-main min-w-0 flex-1">
                <div className="owm-b3-top">
                  <div className="owm-b3-nm" title={c.influencer_name}>{c.influencer_name}</div>
                  <div className="owm-b3-amt">
                    <span className="owm-b3-amt-num">{fmtMetric(val, metric)}</span>
                    <span className="owm-b3-amt-lbl">{metric === 'likes' ? '좋아요' : '조회'}</span>
                  </div>
                </div>
                <div className="owm-b3-meta">
                  <span className="owm-b3-chip">
                    <i className="owm-b3-cdot" style={{ background: locColor }} />
                    {c.location.replace('점', '')}
                  </span>
                  <span className="owm-b3-ch">{CHANNEL_SHORT[c.channel] ?? c.channel}</span>
                </div>
              </div>
            </div>
          )
          return linkable ? (
            <a
              key={c.id}
              href={c.upload_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="owm-b3-item owm-b3-item-link"
              style={{ '--acc': acc } as CSSProperties}
              title={`${c.influencer_name} 콘텐츠 보기`}
            >
              {row}
            </a>
          ) : (
            <div key={c.id} className="owm-b3-item" style={{ '--acc': acc } as CSSProperties}>
              {row}
            </div>
          )
        })}
      </div>
    </div>
  )
}
