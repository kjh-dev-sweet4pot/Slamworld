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

function getDbUrl(env) {
  return env.SUPABASE_DB_URL || env.DATABASE_URL
}

export { getDbUrl }

export async function runSqlFile(client, relativePath) {
  const sql = readFileSync(resolve(root, relativePath), 'utf8')
  await client.query(sql)
}

export async function connectDb(dbUrl) {
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  return client
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isMain) {
  const env = { ...loadEnv(), ...process.env }
  const dbUrl = getDbUrl(env)
  if (!dbUrl) {
    console.error(`
SUPABASE_DB_URL 이 .env 에 없습니다.

Supabase Dashboard → SQL Editor 에서 supabase/seed.sql 을 실행하거나,
Database → Connection string 을 .env 에 추가한 뒤 다시 실행하세요.
`)
    process.exit(1)
  }

  const client = await connectDb(dbUrl)
  try {
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM contents')
    if (rows[0].n > 0) {
      console.log(`contents 테이블에 이미 ${rows[0].n}건 있습니다. 시드를 건너뜁니다.`)
    } else {
      await runSqlFile(client, 'supabase/seed.sql')
      const after = await client.query('SELECT COUNT(*)::int AS n FROM contents')
      console.log(`✓ 시드 완료 (${after.rows[0].n}건)`)
    }
  } catch (err) {
    console.error('✗ 시드 실패:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}
