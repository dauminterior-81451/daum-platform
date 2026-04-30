'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { newId, Site, SITE_STATUS_LABELS, SiteStatus, storage } from '../lib/storage'

const STATUS_BADGE: Record<SiteStatus, string> = {
  pre_contract: 'bg-slate-100 text-slate-600',
  in_progress:  'bg-blue-100 text-blue-700',
  completed:    'bg-green-100 text-green-700',
}

const FILTER_OPTIONS: { key: SiteStatus | '전체'; label: string }[] = [
  { key: '전체',         label: '전체'   },
  { key: 'pre_contract', label: '계약전' },
  { key: 'in_progress',  label: '진행중' },
  { key: 'completed',    label: '완료'   },
]

const emptyForm = {
  name: '', customerId: '', address: '',
  customerName: '', customerPhone: '', customerEmail: '',
  startDate: '', status: 'pre_contract' as SiteStatus, memo: '',
}

export default function SitesPage() {
  const [sites, setSites]               = useState<Site[]>([])
  const [form, setForm]                 = useState(emptyForm)
  const [editId, setEditId]             = useState<string | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [filterStatus, setFilterStatus] = useState<SiteStatus | '전체'>('전체')
  const [searchQuery, setSearchQuery]   = useState('')

  useEffect(() => {
    storage.sites.list().then(setSites)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      const updated: Site = { ...sites.find(s => s.id === editId)!, ...form }
      await storage.sites.upsert(updated)
      setSites(prev => prev.map(s => s.id === editId ? updated : s))
    } else {
      const newSite: Site = { id: newId(), createdAt: new Date().toISOString(), ...form }
      await storage.sites.upsert(newSite)
      setSites(prev => [...prev, newSite])
    }
    setForm(emptyForm); setEditId(null); setShowForm(false)
  }

  function handleEdit(s: Site) {
    setForm({
      name: s.name, customerId: s.customerId, address: s.address,
      customerName: s.customerName ?? '', customerPhone: s.customerPhone ?? '',
      customerEmail: s.customerEmail ?? '', startDate: s.startDate,
      status: s.status, memo: s.memo,
    })
    setEditId(s.id); setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.sites.remove(id)
    setSites(prev => prev.filter(s => s.id !== id))
  }

  const q = searchQuery.trim().toLowerCase()
  const filtered = sites
    .filter(s => filterStatus === '전체' || s.status === filterStatus)
    .filter(s =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.customerName ?? '').toLowerCase().includes(q) ||
      (s.address ?? '').toLowerCase().includes(q)
    )

  const emptyMessage = sites.length === 0 ? '등록된 현장이 없습니다.' : '검색 결과가 없습니다.'

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-slate-400'

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">현장관리</h2>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true) }}
          className="bg-slate-900 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-slate-800 transition min-h-[44px]"
        >
          + 현장 등록
        </button>
      </div>

      {/* 검색바 */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="현장명, 고객명, 주소 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-white"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            ✕
          </button>
        )}
      </div>

      {/* 상태 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTER_OPTIONS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilterStatus(key)}
            className={`text-sm px-4 py-2 rounded-full border transition-colors min-h-[44px] ${
              filterStatus === key
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editId ? '현장 수정' : '현장 등록'}</h3>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">고객 정보</p>
                <div className="space-y-3">
                  {([
                    { label: '고객명',   key: 'customerName'  as const, type: 'text'  },
                    { label: '연락처',   key: 'customerPhone' as const, type: 'text'  },
                    { label: '이메일',   key: 'customerEmail' as const, type: 'email' },
                  ]).map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                      <input type={type} value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">현장 정보</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">현장명 *</label>
                    <input type="text" required value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">주소</label>
                    <input type="text" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">착공일</label>
                    <input type="date" value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">상태</label>
                    <select value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as SiteStatus })}
                      className={inputCls}>
                      {(['pre_contract', 'in_progress', 'completed'] as SiteStatus[]).map((s) => (
                        <option key={s} value={s}>{SITE_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">메모</label>
                    <input type="text" value={form.memo}
                      onChange={(e) => setForm({ ...form, memo: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <button type="submit"
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition min-h-[44px]">
                저장
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm hover:bg-slate-50 transition min-h-[44px]">
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 모바일 카드 */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">{emptyMessage}</p>
        ) : filtered.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <Link href={`/sites/${s.id}`} className="font-semibold text-slate-800 hover:text-blue-600 block truncate">
                  {s.name}
                </Link>
                {s.customerName && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {s.customerName}{s.customerPhone && ` · ${s.customerPhone}`}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_BADGE[s.status]}`}>
                {SITE_STATUS_LABELS[s.status]}
              </span>
            </div>
            {s.address && <p className="text-xs text-slate-400 mb-2 truncate">{s.address}</p>}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400">{s.startDate || ''}</span>
              <div className="flex gap-3">
                <Link href={`/sites/${s.id}`} className="text-xs text-blue-600 font-medium min-h-[44px] flex items-center">상세</Link>
                <button onClick={() => handleEdit(s)} className="text-xs text-slate-500 min-h-[44px] flex items-center">수정</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 min-h-[44px] flex items-center">삭제</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크탑 테이블 */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">{emptyMessage}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
              <tr>
                {['고객명', '연락처', '이메일', '현장명', '주소', '상태', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">{s.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.customerPhone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.customerEmail || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/sites/${s.id}`} className="hover:text-blue-600">{s.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{s.address || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[s.status]}`}>
                      {SITE_STATUS_LABELS[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <Link href={`/sites/${s.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                    <button onClick={() => handleEdit(s)} className="text-xs text-slate-500 hover:underline">수정</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
