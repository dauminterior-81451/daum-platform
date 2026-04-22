'use client'

import { useEffect, useState } from 'react'
import { Customer, newId, storage } from '../lib/storage'

const empty: Omit<Customer, 'id' | 'createdAt'> = {
  name: '',
  phone: '',
  email: '',
  address: '',
  memo: '',
}

export default function CustomersPage() {
  const [list, setList] = useState<Customer[]>([])
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setList(storage.customers.list())
  }, [])

  function persist(data: Customer[]) {
    storage.customers.save(data)
    setList(data)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editId) {
      persist(list.map((c) => (c.id === editId ? { ...c, ...form } : c)))
    } else {
      persist([...list, { id: newId(), createdAt: new Date().toISOString(), ...form }])
    }
    setForm(empty)
    setEditId(null)
    setShowForm(false)
  }

  function handleEdit(c: Customer) {
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, memo: c.memo })
    setEditId(c.id)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    persist(list.filter((c) => c.id !== id))
  }

  const filtered = list.filter(
    (c) =>
      c.name.includes(search) || c.phone.includes(search) || c.address.includes(search),
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">고객관리</h2>
        <button
          onClick={() => { setForm(empty); setEditId(null); setShowForm(true) }}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + 고객 추가
        </button>
      </div>

      <input
        type="text"
        placeholder="이름·전화·주소 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-3"
          >
            <h3 className="font-semibold text-gray-800">{editId ? '고객 수정' : '고객 추가'}</h3>
            {(['name', 'phone', 'email', 'address', 'memo'] as const).map((f) => (
              <div key={f}>
                <label className="text-xs text-gray-500 mb-1 block">
                  {f === 'name' ? '이름' : f === 'phone' ? '전화' : f === 'email' ? '이메일' : f === 'address' ? '주소' : '메모'}
                </label>
                <input
                  type="text"
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  required={f === 'name'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">등록된 고객이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                {['이름', '전화', '이메일', '주소', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-gray-600">{c.address}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleEdit(c)} className="text-blue-600 hover:underline text-xs">수정</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:underline text-xs">삭제</button>
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
