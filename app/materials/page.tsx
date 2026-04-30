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

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-center text-slate-400 py-12 text-sm">자재 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {rows.map(({ material: m, site }) => (
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">
                      {m.category
                        ? <><span className="text-slate-400 font-normal">{m.category} · </span>{m.name}</>
                        : m.name
                      }
                    </p>
                    {m.spec && <p className="text-xs text-slate-400 mt-0.5">{m.spec}</p>}
                  </div>
                  <Link href={`/sites/${site.id}`}
                    className="text-xs text-blue-600 font-medium shrink-0 hover:underline">
                    {site.name}
                  </Link>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  {m.supplier && (
                    <span className="text-xs text-slate-500">{m.supplier}</span>
                  )}
                  <span className="text-xs text-slate-400 ml-auto">{m.purchaseDate || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 데스크탑 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  {['현장명', '자재명', '규격', '공급업체', '구매일'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ material: m, site }) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {m.category
                        ? <><span className="text-slate-400">{m.category}</span> | {m.name}</>
                        : m.name
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-500">{m.spec || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{m.supplier || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{m.purchaseDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
