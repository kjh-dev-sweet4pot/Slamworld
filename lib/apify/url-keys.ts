/** URL → 매칭 키 (Apify 결과와 DB row 연결) */

export function urlMatchKeys(url: string): string[] {
  const keys = new Set<string>()
  try {
    const u = new URL(url.trim())
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    const path = u.pathname.replace(/\/+$/, '')
    keys.add(`${host}${path}`.toLowerCase())

    // Instagram /p/ or /reel/ or /reels/
    const ig = path.match(/\/(p|reels?|tv)\/([^/?#]+)/i)
    if (ig) keys.add(`instagram:${ig[2]}`)
    else {
      const igUser = path.match(/^\/([A-Za-z0-9._]+)$/)
      if (host.includes('instagram.com') && igUser && !['p', 'reel', 'reels', 'tv', 'stories', 'explore'].includes(igUser[1].toLowerCase())) {
        keys.add(`ig-user:${igUser[1].toLowerCase()}`)
      }
    }

    // TikTok video id
    const tt = path.match(/\/video\/(\d+)/)
    if (tt) keys.add(`tiktok:${tt[1]}`)
    const vt = url.match(/(?:vm|vt)\.tiktok\.com\/([^/?#]+)/i)
    if (vt) keys.add(`tiktok-short:${vt[1].toLowerCase()}`)
    const ttUser = path.match(/^\/@([^/?#]+)/)
    if (ttUser) keys.add(`tiktok-user:${ttUser[1].toLowerCase()}`)

    // Xiaohongshu note id (24 hex)
    const xhsUser = path.match(/\/user\/profile\/([a-f0-9]{24})/i)
    if (xhsUser) keys.add(`xhs-user:${xhsUser[1].toLowerCase()}`)
    const xhs = path.match(/\/(?:explore|discovery\/item|user\/profile\/[^/]+)\/([a-f0-9]{24})/i)
      ?? url.match(/([a-f0-9]{24})/i)
    if (xhs) keys.add(`xhs:${xhs[1].toLowerCase()}`)

    // Douyin video id / short link
    const dy = path.match(/\/(?:share\/)?video\/(\d+)/)
    if (dy) keys.add(`douyin:${dy[1]}`)
    const dyShort = path.match(/^\/([^/?#]+)/)
    if (host.includes('v.douyin.com') && dyShort) keys.add(`douyin-short:${dyShort[1].toLowerCase()}`)
    const dyUser = path.match(/\/user\/([^/?#]+)/)
    if (dyUser) keys.add(`douyin-user:${dyUser[1].toLowerCase()}`)
    const short = path.match(/\/(?:m|o)\/([^/?#]+)/i)
    if (host.includes('xhslink') && short) keys.add(`xhslink:${short[1].toLowerCase()}`)
  } catch {
    keys.add(url.trim().toLowerCase())
  }
  return [...keys]
}

export function buildUrlIndex(urls: string[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const url of urls) {
    for (const key of urlMatchKeys(url)) {
      index.set(key, url)
    }
  }
  return index
}

export function findOriginalUrl(
  index: Map<string, string>,
  candidateUrls: string[],
): string | undefined {
  for (const c of candidateUrls) {
    if (!c) continue
    for (const key of urlMatchKeys(c)) {
      const hit = index.get(key)
      if (hit) return hit
    }
  }
  return undefined
}
