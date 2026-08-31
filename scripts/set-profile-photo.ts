/**
 * 수동 프로필 사진 업로드
 * Usage: npx tsx scripts/set-profile-photo.ts <이름> <이미지경로>
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createAdminSupabase } from '../lib/supabase-admin'
import { PROFILE_BUCKET } from '../lib/apify/config'
import { ensureProfileBucket, ensureProfileImageColumn } from '../lib/apify/profile-photos'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

async function main() {
  const name = process.argv[2]
  const imgPath = process.argv[3]
  if (!name || !imgPath) {
    console.error('Usage: npx tsx scripts/set-profile-photo.ts <이름> <이미지경로>')
    process.exit(1)
  }

  loadEnv()
  const abs = resolve(imgPath)
  if (!existsSync(abs)) throw new Error(`file not found: ${abs}`)

  const ext = abs.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg'
  const buf = readFileSync(abs)

  const supabase = createAdminSupabase()
  await ensureProfileBucket(supabase)
  const hasColumn = await ensureProfileImageColumn(supabase)

  const { data: rows, error: qErr } = await supabase
    .from('contents')
    .select('id, influencer_name, channel, location')
    .eq('influencer_name', name)

  if (qErr) throw new Error(qErr.message)
  if (!rows?.length) throw new Error(`${name} not found in contents`)

  for (const row of rows) {
    const byIdPath = `by-id/${row.id}`
    const { error: upErr } = await supabase.storage
      .from(PROFILE_BUCKET)
      .upload(byIdPath, buf, { contentType, upsert: true })
    if (upErr) throw new Error(`storage: ${upErr.message}`)

    const { data: pub } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(byIdPath)
    if (hasColumn) {
      const { error: dbErr } = await supabase
        .from('contents')
        .update({ profile_image_url: pub.publicUrl })
        .eq('id', row.id)
      if (dbErr) throw new Error(`db: ${dbErr.message}`)
    }

    console.log(`✓ ${row.influencer_name} (id=${row.id}, ${row.channel}·${row.location})`)
    console.log(`  ${pub.publicUrl}`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
