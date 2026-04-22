'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Customer, newId, Site, SiteStatus, storage } from '../lib/storage'

const statusColors: Record<SiteStatus, string> = {
  진행중: 'bg-green-100 text-green-700',
  완료: 'bg-gray-100 text-gray-600',
  보류: 'bg-yellow-100 text-yellow-700',
}

const emptyForm = {
  name: '',
  customerId: '',
  address: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  startDate: '',
  status: '진행중' as SiteStatus,
  memo: '',
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<SiteStatus | '전체'>('전체')

  useEffect(() => {
    setSites(storage.sites.list())
    setCustomers(storage.customers.list())
  }, [])

  function persist(data: Site[]) {
    storage.sites.save(data)
    setSites(data)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      persist(sites.map((s) => (s.id === editId ? { ...s, ...form } : s)))
    } else {
      persist([...sites, { id: newId(), createdAt: new Date().toISOString(), ...form }])
    }
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
  }

  function handleEdit(s: Site) {
    setForm({
      name: s.name,
      customerId: s.customerId,
      address: s.address,
      customerName:  s.customerName  ?? '',
      customerPhone: s.customerPhone ?? '',
      customerEmail: s.customerEmail ?? '',
      startDate: s.startDate,
      status: s.status,
      memo: s.memo,
    })
    setEditId(s.id)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    persist(sites.filter((s) => s.id !== id))
  }

  const filtered =
    filterStatus === '전체' ? sites : sites.filter((s) => s.status === filterStatus)

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.name]))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">현장목록</h2>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 현장 등록
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['전체', '진행중', '완료', '보류'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-3"
          >
            <h3 className="font-semibold text-gray-800">{editId ? '현장 수정' : '현장 등록'}</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">현장명 *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">고객</label>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">주소</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">고객명</label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">연락처</label>
              <input
                type="text"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">이메일</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">착공일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">상태</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SiteStatus })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {(['진행중', '완료', '보류'] as SiteStatus[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">메모</label>
              <input
                type="text"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">
                저장
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-sm text-gray-400">
            등록된 현장이 없습니다.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/sites/${s.id}`} className="font-semibold text-gray-800 hover:text-blue-600 truncate">
                    {s.name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {customerMap[s.customerId] ? `고객: ${customerMap[s.customerId]} · ` : ''}
                  {s.address || '주소 미입력'}
                  {s.startDate ? ` · 착공 ${s.startDate}` : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/sites/${s.id}`} className="text-xs text-blue-600 hover:underline">상세</Link>
                <button onClick={() => handleEdit(s)} className="text-xs text-gray-500 hover:underline">수정</button>
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
