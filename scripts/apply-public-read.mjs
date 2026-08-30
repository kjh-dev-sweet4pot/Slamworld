import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

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
const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL

if (!dbUrl) {
  console.error(`
SUPABASE_DB_URL 이 .env 에 없습니다.

Supabase Dashboard → Project Settings → Database → Connection string (URI)
를 복사해서 .env 에 추가하세요:

  SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@...

그다음 다시 실행:
  npm run db:public-read

또는 supabase/enable-public-read.sql 내용을
Supabase Dashboard → SQL Editor 에 붙여넣어 실행하세요.
`)
  process.exit(1)
}

const sql = readFileSync(resolve(root, 'supabase/enable-public-read.sql'), 'utf8')
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  await client.query(sql)
  console.log('✓ public read RLS 정책 적용 완료')
} catch (err) {
  console.error('✗ 적용 실패:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
