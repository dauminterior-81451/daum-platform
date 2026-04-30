'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Quote, Site, storage } from '../lib/storage'

type Row = { quote: Quote; site: Site; total: number }

export default function EstimatesPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([storage.quotes.list(), storage.sites.list()]).then(([quotes, sites]) => {
      const siteMap = new Map(sites.map(s => [s.id, s]))
      const r: Row[] = quotes
        .map(q => {
          const site = siteMap.get(q.siteId)
          if (!site) return null
          const supply = q.items.filter(i => i.unit !== '__group__').reduce((s, i) => s + i.qty * i.unitPrice, 0)
          const tm     = q.taxMode ?? 'exc'
          const total  = tm === 'exc' ? Math.round(supply * 1.1) : supply
          return { quote: q, site, total }
        })
        .filter((r): r is Row => r !== null)
        .sort((a, b) => b.quote.date.localeCompare(a.quote.date))
      setRows(r)
    })
  }, [])

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-5">견적서</h2>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-semibold text-slate-700 mb-1">작성된 견적서가 없습니다</p>
          <p className="text-sm text-slate-400 mb-5">현장 상세 페이지에서 견적서를 작성할 수 있습니다.</p>
          <Link href="/sites"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition">
            견적서 작성하러 가기 →
          </Link>
        </div>
      ) : (
        <>
          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {rows.map(({ quote, site, total }) => (
              <div key={quote.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <Link href={`/sites/${site.id}`} className="font-semibold text-slate-800 hover:text-blue-600 block truncate">
                      {site.name}
                    </Link>
                    {site.customerName && <p className="text-sm text-slate-500 mt-0.5">{site.customerName}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium shrink-0">
                    {quote.revision ?? 1}차
                  </span>
                </div>
                <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{total.toLocaleString()}원</p>
                    <p className="text-xs text-slate-400 mt-0.5">{quote.date}</p>
                  </div>
                  <Link href={`/sites/${site.id}/quotes/${quote.id}/preview`}
                    className="text-sm text-blue-600 font-medium hover:underline min-h-[44px] flex items-center">
                    미리보기 →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 데스크탑 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  {['현장명', '고객명', '차수', '견적금액', '견적일', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ quote, site, total }) => (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{site.customerName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{quote.revision ?? 1}차</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{total.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-slate-500">{quote.date}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/sites/${site.id}/quotes/${quote.id}/preview`}
                        className="text-xs text-blue-600 hover:underline font-medium">미리보기</Link>
                    </td>
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
