import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { budgetsFromRounds, discussingCompanyRows, entryDiscussingCompanyRows } from '@/lib/brand-budget'
import { isTestCompany } from '@/lib/test-companies.mjs'
import { createServerSupabase } from '@/lib/supabase-server'

const SELECT = 'company_name,label,period_month,amount_krw,deposit_status,usage_status,kind'

export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('company_budget_rounds')
    .select(SELECT)
    .order('period_month')

  if (error) {
    const missing = /company_budget_rounds|schema cache|does not exist/i.test(error.message)
    if (missing) return NextResponse.json({ rows: [], missing: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []).filter(r => !isTestCompany({ name: r.company_name }))
  const budgets = budgetsFromRounds(rows)
  return NextResponse.json({
    rows: budgets,
    discussing: discussingCompanyRows(rows),
    entryDiscussing: entryDiscussingCompanyRows(rows),
  })
}
