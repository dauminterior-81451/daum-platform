import { createClient } from '@supabase/supabase-js'

// 빌드 시 환경변수 없을 때 createClient가 throw하지 않도록 placeholder 사용
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

export const supabase = createClient(url, key)
