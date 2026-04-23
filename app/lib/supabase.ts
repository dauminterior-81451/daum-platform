import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

// 빌드 시 환경변수 없을 때 createClient가 throw하지 않도록 placeholder 사용
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

// DB 쿼리용 기존 클라이언트
export const supabase = createClient(url, key)

// Auth용 — 세션을 쿠키에 저장하여 proxy(미들웨어)에서 읽을 수 있게 함
export function createAuthClient() {
  return createBrowserClient(url, key)
}

export const fileStorage = {
  upload: async (bucket: string, path: string, file: File): Promise<string> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  },
  remove: async (bucket: string, path: string): Promise<void> => {
    const { error } = await supabase.storage.from(bucket).remove([path])
    if (error) console.error(`[fileStorage:${bucket}:remove]`, error)
  },
}
