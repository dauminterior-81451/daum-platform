'use client'

import { useEffect, useRef, useState } from 'react'
import { fileStorage } from '../lib/supabase'
import { newId, storage } from '../lib/storage'

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '', ceoName: '', phone: '', address: '',
  })
  const [logoUrl, setLogoUrl]     = useState<string>('')
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoFile, setLogoFile]   = useState<File | null>(null)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storage.companySettings.get().then(s => {
      if (!s) return
      setForm({ name: s.name, ceoName: s.ceoName ?? '', phone: s.phone ?? '', address: s.address ?? '' })
      setLogoUrl(s.logoUrl ?? '')
    })
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      let finalLogoUrl = logoUrl
      if (logoFile) {
        const ext  = logoFile.name.split('.').pop() ?? 'png'
        const path = `logo_${newId()}.${ext}`
        finalLogoUrl = await fileStorage.upload('company', path, logoFile)
        setLogoUrl(finalLogoUrl)
        setLogoFile(null)
      }
      await storage.companySettings.save({
        name:    form.name.trim(),
        ceoName: form.ceoName.trim() || undefined,
        phone:   form.phone.trim()   || undefined,
        address: form.address.trim() || undefined,
        logoUrl: finalLogoUrl        || undefined,
      })
      // 사이드바 회사명 즉시 갱신
      window.dispatchEvent(new CustomEvent('companySettingsUpdated', {
        detail: { name: form.name.trim(), logoUrl: finalLogoUrl },
      }))
      setToast('저장되었습니다')
      setTimeout(() => setToast(''), 2500)
    } catch (err) {
      console.error(err)
      setToast('저장 실패: ' + (err instanceof Error ? err.message : String(err)))
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const displayLogo = logoPreview || logoUrl
  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400'

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <h2 className="text-xl font-bold text-slate-800 mb-6">설정</h2>

      <form onSubmit={handleSave} className="space-y-5">
        {/* 로고 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm font-medium text-slate-600 mb-4">회사 로고</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {displayLogo ? (
                <img src={displayLogo} alt="로고" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl">🏢</span>
              )}
            </div>
            <div className="flex-1">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-sm px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition">
                {displayLogo ? '로고 변경' : '로고 업로드'}
              </button>
              <p className="text-xs text-slate-400 mt-1.5">PNG, JPG · 권장 크기 200×200px</p>
              {logoFile && (
                <p className="text-xs text-blue-600 mt-1">{logoFile.name} 선택됨</p>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </div>

        {/* 회사 정보 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className="text-sm font-medium text-slate-600">회사 정보</p>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">회사명 *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="예: 다움인테리어"
              lang="ko"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">대표자명</label>
            <input
              type="text"
              value={form.ceoName}
              onChange={e => setForm({ ...form, ceoName: e.target.value })}
              placeholder="홍길동"
              lang="ko"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">연락처</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="010-0000-0000"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">주소</label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="대전시 ..."
              lang="ko"
              autoComplete="off"
              className={inputCls}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
