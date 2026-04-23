'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Material, Site, storage } from '../lib/storage'

type Row = { material: Material; site: Site }

export default function MaterialsPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([storage.materials.list(), storage.sites.list()]).then(([materials, sites]) => {
      const siteMap = new Map(sites.map(s => [s.id, s]))
      const r: Row[] = materials
        .map(m => {
          const site = siteMap.get(m.siteId)
          if (!site) return null
          return { material: m, site }
        })
        .filter((r): r is Row => r !== null)
        .sort((a, b) => b.material.purchaseDate.localeCompare(a.material.purchaseDate))
      setRows(r)
    })
  }, [])

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-5">자재관리</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">자재 내역이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['현장명', '자재명', '규격', '수량', '단가', '공급업체', '구매일'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ material: m, site }) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{m.name}</td>
                  <td className="px-4 py-3 text-slate-500">{m.spec || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{m.qty} {m.unit}</td>
                  <td className="px-4 py-3 text-slate-700">{m.unitPrice > 0 ? `${m.unitPrice.toLocaleString()}원` : '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{m.supplier || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{m.purchaseDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
