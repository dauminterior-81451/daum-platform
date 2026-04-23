'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Quote, Site, storage } from '../lib/storage'

type Row = {
  quote: Quote
  site: Site
  total: number
}

export default function EstimatesPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([storage.quotes.list(), storage.sites.list()]).then(([quotes, sites]) => {
      const siteMap = new Map(sites.map(s => [s.id, s]))
      const r: Row[] = quotes
        .map(q => {
          const site = siteMap.get(q.siteId)
          if (!site) return null
          const supply = q.items
            .filter(i => i.unit !== '__group__')
            .reduce((s, i) => s + i.qty * i.unitPrice, 0)
          const tm    = q.taxMode ?? 'exc'
          const total = tm === 'exc' ? Math.round(supply * 1.1) : supply
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">견적서가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['현장명', '고객명', '차수', '견적금액', '견적일', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ quote, site, total }) => (
                <tr key={quote.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{site.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{quote.revision ?? 1}차</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{total.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-slate-500">{quote.date}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sites/${site.id}/quotes/${quote.id}/preview`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      미리보기
                    </Link>
                  </td>
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
