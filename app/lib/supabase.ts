import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'

// 싱글톤: auth + DB 동일 인스턴스 → GoTrueClient 하나만 생성, 세션 공유
const _client = createBrowserClient(url, key)

export const supabase = _client

export function createAuthClient() {
  return _client
}

export const fileStorage = {
  upload: async (bucket: string, path: string, file: File): Promise<string> => {
    const { error } = await _client.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) throw error
    return _client.storage.from(bucket).getPublicUrl(path).data.publicUrl
  },
  remove: async (bucket: string, path: string): Promise<void> => {
    const { error } = await _client.storage.from(bucket).remove([path])
    if (error) console.error(`[fileStorage:${bucket}:remove]`, error)
  },
}
