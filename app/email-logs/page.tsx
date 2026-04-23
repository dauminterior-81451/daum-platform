'use client'

import { useEffect, useState } from 'react'
import { storage, EmailLog, Site } from '../lib/storage'

type FilterStatus = 'all' | 'success' | 'failed'

export default function EmailLogsPage() {
  const [logs, setLogs]       = useState<EmailLog[]>([])
  const [sites, setSites]     = useState<Site[]>([])
  const [filter, setFilter]   = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([storage.emailLogs.list(), storage.sites.list()]).then(
      ([logData, siteData]) => {
        setLogs(logData)
        setSites(siteData)
        setLoading(false)
      },
    )
  }, [])

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]))

  const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter)

  const counts = {
    all:     logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed:  logs.filter(l => l.status === 'failed').length,
  }

  return (
    <div className="p-4 md:p-8">
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">발송 이력</h1>
        <p className="text-sm text-slate-400 mt-0.5">이메일 발송 전체 기록</p>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(
          [
            { key: 'all',     label: '전체' },
            { key: 'success', label: '성공' },
            { key: 'failed',  label: '실패' },
          ] as { key: FilterStatus; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
              filter === key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs ${filter === key ? 'text-slate-300' : 'text-slate-400'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">발송 이력이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">현장명</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">받는 사람</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">제목</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">상태</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">발송 시각</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                >
                  <td className="px-5 py-3 text-slate-700 font-medium">
                    {log.siteId ? (siteMap[log.siteId] ?? '-') : '-'}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {log.recipientName
                      ? `${log.recipientName} (${log.recipientEmail})`
                      : log.recipientEmail}
                  </td>
                  <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{log.subject}</td>
                  <td className="px-5 py-3">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ✅ 성공
                      </span>
                    ) : log.status === 'failed' ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full cursor-help"
                        title={log.errorMessage ?? ''}
                      >
                        ❌ 실패
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        대기
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.sentAt).toLocaleString('ko-KR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
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
