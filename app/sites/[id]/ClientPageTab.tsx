'use client'

import { useEffect, useState } from 'react'
import { ClientInquiry, ClientNotice, storage } from '../../lib/storage'

export default function ClientPageTab({ siteId }: { siteId: string }) {
  const [notices, setNotices] = useState<ClientNotice[]>([])
  const [inquiries, setInquiries] = useState<ClientInquiry[]>([])
  const [noticeInput, setNoticeInput] = useState('')
  const [editNoticeId, setEditNoticeId] = useState<string | null>(null)
  const [editNoticeVal, setEditNoticeVal] = useState('')
  const [copied, setCopied] = useState(false)

  const clientUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/client/${siteId}`
      : `/client/${siteId}`

  useEffect(() => {
    storage.clientNotices.listBySite(siteId).then(setNotices)
    storage.clientInquiries.listBySite(siteId).then(setInquiries)
  }, [siteId])

  function copyUrl() {
    navigator.clipboard.writeText(clientUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function addNotice() {
    if (!noticeInput.trim()) return
    try {
      const item = await storage.clientNotices.insert({
        siteId,
        content: noticeInput.trim(),
        createdAt: new Date().toISOString(),
      })
      setNotices(prev => [item, ...prev])
      setNoticeInput('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`공지 저장 실패: ${msg}`)
    }
  }

  async function saveEditNotice() {
    if (!editNoticeId || !editNoticeVal.trim()) return
    const orig = notices.find(n => n.id === editNoticeId)!
    const updated = { ...orig, content: editNoticeVal.trim() }
    await storage.clientNotices.upsert(updated)
    setNotices(prev => prev.map(n => n.id === editNoticeId ? updated : n))
    setEditNoticeId(null)
  }

  async function deleteNotice(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await storage.clientNotices.remove(id)
    setNotices(prev => prev.filter(n => n.id !== id))
  }

  async function saveAnswer(iq: ClientInquiry, answer: string) {
    const updated: ClientInquiry = {
      ...iq,
      answer: answer.trim(),
      answered_at: new Date().toISOString(),
    }
    await storage.clientInquiries.upsert(updated)
    setInquiries(prev => prev.map(i => i.id === iq.id ? updated : i))
  }

  return (
    <div className="space-y-5">
      {/* 고객 링크 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">고객 전용 링크</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={clientUrl}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 bg-slate-50 focus:outline-none min-w-0"
          />
          <button
            onClick={copyUrl}
            className="shrink-0 text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition whitespace-nowrap"
          >
            {copied ? '복사됨!' : '링크 복사'}
          </button>
        </div>
      </div>

      {/* 공지/메모 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">공지/메모</p>
        <div className="flex gap-2 mb-3">
          <input
            value={noticeInput}
            onChange={e => setNoticeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addNotice() }}
            placeholder="공지 내용 입력"
            lang="ko"
            inputMode="text"
            autoComplete="off"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-400"
          />
          <button
            onClick={addNotice}
            className="shrink-0 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            추가
          </button>
        </div>
        <div className="space-y-2">
          {notices.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">등록된 공지가 없습니다.</p>
          )}
          {notices.map(n => (
            <div key={n.id} className="border border-slate-100 rounded-lg p-3">
              {editNoticeId === n.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    value={editNoticeVal}
                    onChange={e => setEditNoticeVal(e.target.value)}
                    lang="ko"
                    inputMode="text"
                    className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none"
                  />
                  <button onClick={saveEditNotice} className="text-xs text-blue-600 hover:underline">저장</button>
                  <button onClick={() => setEditNoticeId(null)} className="text-xs text-slate-400 hover:underline">취소</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-sm text-slate-700">{n.content}</p>
                  <span className="text-xs text-slate-400 shrink-0">{n.createdAt.slice(0, 10)}</span>
                  <button
                    onClick={() => { setEditNoticeId(n.id); setEditNoticeVal(n.content) }}
                    className="text-xs text-blue-600 hover:underline shrink-0"
                  >
                    수정
                  </button>
                  <button onClick={() => deleteNotice(n.id)} className="text-xs text-red-500 hover:underline shrink-0">
                    삭제
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 고객 문의 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <p className="text-xs font-semibold text-slate-500 mb-3">고객 문의</p>
        {inquiries.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">접수된 문의가 없습니다.</p>
        )}
        <div className="space-y-3">
          {inquiries.map(iq => (
            <InquiryCard key={iq.id} inquiry={iq} onSaveAnswer={saveAnswer} />
          ))}
        </div>
      </div>
    </div>
  )
}

function InquiryCard({
  inquiry,
  onSaveAnswer,
}: {
  inquiry: ClientInquiry
  onSaveAnswer: (i: ClientInquiry, a: string) => void
}) {
  const [answerText, setAnswerText] = useState(inquiry.answer || '')
  const [editing, setEditing] = useState(false)

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2">
      <div>
        <p className="text-xs text-slate-400 mb-0.5">{inquiry.createdAt.slice(0, 10)} · 고객 문의</p>
        <p className="text-sm text-slate-700 font-medium">{inquiry.content}</p>
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            rows={3}
            placeholder="답변 입력..."
            lang="ko"
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onSaveAnswer(inquiry, answerText); setEditing(false) }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              저장
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 rounded-lg p-2.5 flex items-start gap-2">
          <div className="flex-1 text-sm">
            {inquiry.answer
              ? <span className="text-blue-800">{inquiry.answer}</span>
              : <span className="text-slate-400 italic text-xs">미답변</span>
            }
          </div>
          <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline shrink-0">
            {inquiry.answer ? '수정' : '답변'}
          </button>
        </div>
      )}
    </div>
  )
}
