'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Quote, Settlement, Site, storage } from '../lib/storage'

type Row = {
  site: Site
  contractTotal: number
  paid: number
  unpaid: number
  status: string
}

function calcQuoteTotal(quotes: Quote[], siteId: string): number {
  const sq = quotes.filter(q => q.siteId === siteId)
  if (sq.length === 0) return 0
  const last = sq.reduce((a, b) => (b.revision ?? 1) >= (a.revision ?? 1) ? b : a)
  const supply = last.items
    .filter(i => i.unit !== '__group__')
    .reduce((s, i) => s + i.qty * i.unitPrice, 0)
  const tm = last.taxMode ?? 'exc'
  return tm === 'exc' ? Math.round(supply * 1.1) : supply
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([
      storage.sites.list(),
      storage.quotes.list(),
      storage.payments.list(),
    ]).then(async ([sites, quotes, payments]) => {
      const settled = await Promise.all(
        sites.map(s => storage.settlements.get(s.id))
      )
      const r: Row[] = sites.map((site, i) => {
        const settlement = settled[i] as Settlement | null
        const contractTotal = settlement?.contractTotal ?? calcQuoteTotal(quotes, site.id)
        const paid = payments
          .filter(p => p.siteId === site.id)
          .reduce((s, p) => s + p.amount, 0)
        const unpaid = Math.max(0, contractTotal - paid)
        const status = unpaid === 0 && contractTotal > 0 ? '완납' : contractTotal === 0 ? '—' : '미수'
        return { site, contractTotal, paid, unpaid, status }
      })
      setRows(r.sort((a, b) => b.site.createdAt.localeCompare(a.site.createdAt)))
    })
  }, [])

  const STATUS_STYLE: Record<string, string> = {
    '완납': 'bg-green-100 text-green-700',
    '미수':  'bg-red-100 text-red-600',
    '—':    'bg-slate-100 text-slate-400',
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6">입금/정산</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">현장이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                {['현장명', '고객명', '계약금액', '수금액', '미수금', '상태'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ site, contractTotal, paid, unpaid, status }) => (
                <tr key={site.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{site.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{contractTotal > 0 ? `${contractTotal.toLocaleString()}원` : '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{paid > 0 ? `${paid.toLocaleString()}원` : '—'}</td>
                  <td className="px-4 py-3 font-medium text-red-600">{unpaid > 0 ? `${unpaid.toLocaleString()}원` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
                      {status}
                    </span>
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
