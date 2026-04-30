'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Quote, Settlement, Site, storage } from '../lib/storage'

type Row = { site: Site; contractTotal: number; paid: number; unpaid: number; status: string }

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

function calcSettlementPaid(s: Settlement): number {
  return (['deposit', 'startup', 'interim', 'balance'] as const)
    .filter(k => s[k].paid)
    .reduce((sum, k) => sum + (s[k].amount || 0), 0)
}

const STATUS_STYLE: Record<string, string> = {
  '완납': 'bg-green-100 text-green-700',
  '미수': 'bg-red-100 text-red-600',
  '—':   'bg-slate-100 text-slate-400',
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    Promise.all([storage.sites.list(), storage.quotes.list()]).then(async ([sites, quotes]) => {
      const settled = await Promise.all(sites.map(s => storage.settlements.get(s.id)))
      const r: Row[] = sites.map((site, i) => {
        const settlement    = settled[i] as Settlement | null
        const contractTotal = settlement?.contractTotal ?? calcQuoteTotal(quotes, site.id)
        const paid          = settlement ? calcSettlementPaid(settlement) : 0
        const unpaid        = Math.max(0, contractTotal - paid)
        const status        = contractTotal === 0 ? '—' : unpaid === 0 ? '완납' : '미수'
        return { site, contractTotal, paid, unpaid, status }
      })
      setRows(r.sort((a, b) => b.site.createdAt.localeCompare(a.site.createdAt)))
    })
  }, [])

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-5">입금/정산</h2>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <p className="text-center text-slate-400 py-12 text-sm">현장이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {rows.map(({ site, contractTotal, paid, unpaid, status }) => (
              <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <Link href={`/sites/${site.id}`}
                    className="font-semibold text-slate-800 hover:text-blue-600 truncate mr-2">
                    {site.name}
                  </Link>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUS_STYLE[status]}`}>
                    {status}
                  </span>
                </div>
                {site.customerName && (
                  <p className="text-sm text-slate-500 mb-3">{site.customerName}</p>
                )}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">계약금액</p>
                    <p className="text-sm font-bold text-slate-700">
                      {contractTotal > 0 ? contractTotal.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">수금액</p>
                    <p className="text-sm font-bold text-slate-700">
                      {paid > 0 ? paid.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">미수금</p>
                    <p className={`text-sm font-bold ${unpaid > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {unpaid > 0 ? unpaid.toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 데스크탑 테이블 */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-100">
                <tr>
                  {['현장명', '고객명', '계약금액', '수금액', '미수금', '상태'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ site, contractTotal, paid, unpaid, status }) => (
                  <tr key={site.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link href={`/sites/${site.id}`} className="hover:text-blue-600">{site.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{site.customerName || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {contractTotal > 0 ? `${contractTotal.toLocaleString()}원` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {paid > 0 ? `${paid.toLocaleString()}원` : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600">
                      {unpaid > 0 ? `${unpaid.toLocaleString()}원` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
                        {status}
                      </span>
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
