import { createClient } from '@supabase/supabase-js'
import { SW_SCHEMA } from './supabase-schema'

export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: SW_SCHEMA } }
  )
}
