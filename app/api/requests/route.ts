import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { isFullAccess } from '@/lib/session-cookie'

const denied = () => NextResponse.json({ error: '관리자 로그인 필요' }, { status: 401 })

export const dynamic = 'force-dynamic'

export type Requester = 'C-level' | '실무자'

export interface RequestItem {
  id: string
  title: string
  body: string
  requester: Requester
  /** 요청한 사람 이름 */
  requester_name: string | null
  created_at: string
}

const COLS = 'id,title,body,requester,requester_name,created_at'

/** 요청사항 전체 (최신순) */
export async function GET() {
  const { data, error } = await createServerSupabase().from('requests').select(COLS).order('created_at', { ascending: false })
  if (error) {
    const missing = /requests|schema cache|does not exist/i.test(error.message)
    return NextResponse.json({ data: [], missing, error: error.message }, { status: missing ? 200 : 500 })
  }
  return NextResponse.json({ data })
}

/** { title, body, requester } 추가 */
export async function POST(req: Request) {
  if (!(await isFullAccess(req))) return denied()
  const b = await req.json().catch(() => null)
  const title = String(b?.title ?? '').trim().slice(0, 200)
  const body = String(b?.body ?? '').trim().slice(0, 4000)
  const requester = b?.requester === '실무자' ? '실무자' : b?.requester === 'C-level' ? 'C-level' : null
  const requester_name = String(b?.requester_name ?? '').trim().slice(0, 60) || null
  if (!title || !requester) return NextResponse.json({ error: '제목·요청자 필요' }, { status: 400 })
  const { data, error } = await createAdminSupabase().from('requests').insert({ title, body, requester, requester_name }).select(COLS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

/** ?id= 삭제 */
export async function DELETE(req: Request) {
  if (!(await isFullAccess(req))) return denied()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })
  const { error } = await createAdminSupabase().from('requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
