/** Apify Store actor IDs */
export const APIFY_ACTORS = {
  instagram: 'apify/instagram-scraper',
  tiktok: 'clockworks/tiktok-scraper',
  xiaohongshu: 'dltik/rednote-xiaohongshu-scraper',
  xiaohongshuProfile: 'maximedupre/rednote-profile-scraper',
  douyin: 'atomus/douyin-scraper',
} as const

export const PROFILE_BUCKET = 'profile-photos'

/** 한 Actor run 당 URL 수 (타임아웃 방지) */
export const BATCH_SIZE = 40
