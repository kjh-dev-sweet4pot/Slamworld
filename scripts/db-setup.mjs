import { connectDb, getDbUrl, runSqlFile } from './apply-seed.mjs'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function loadEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return {}
  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return env
}

const env = { ...loadEnv(), ...process.env }
const dbUrl = getDbUrl(env)

if (!dbUrl) {
  console.error(`
SUPABASE_DB_URL 이 .env 에 없습니다.

Supabase Dashboard → SQL Editor 에서 아래 파일을 순서대로 실행하세요:
  1. supabase/schema.sql          (최초 1회)
  2. supabase/enable-public-read.sql
  3. supabase/seed.sql
`)
  process.exit(1)
}

const client = await connectDb(dbUrl)
try {
  await runSqlFile(client, 'supabase/enable-public-read.sql')
  console.log('✓ public read RLS 적용')

  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM contents')
  if (rows[0].n > 0) {
    console.log(`contents ${rows[0].n}건 — 시드 건너뜀`)
  } else {
    await runSqlFile(client, 'supabase/seed.sql')
    const after = await client.query('SELECT COUNT(*)::int AS n FROM contents')
    console.log(`✓ 시드 완료 (${after.rows[0].n}건)`)
  }
} catch (err) {
  console.error('✗ setup 실패:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
