'use client'

import { useEffect, useRef, useState } from 'react'
import { DrawingFile, newId, storage } from '../../lib/storage'
import { fileStorage } from '../../lib/supabase'

function formatSize(bytes: number): string {
  if (bytes < 1024)         return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function DrawingTab({ siteId }: { siteId: string }) {
  const [files, setFiles]         = useState<DrawingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    storage.drawingFiles.listBySite(siteId).then(setFiles)
  }, [siteId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `${siteId}/${Date.now()}-${file.name}`
      const url  = await fileStorage.upload('drawings', path, file)
      const item: DrawingFile = {
        id:          newId(),
        siteId,
        name:        file.name,
        url,
        storagePath: path,
        fileType:    file.type || file.name.split('.').pop() || '',
        size:        file.size,
        createdAt:   new Date().toISOString().slice(0, 10),
      }
      await storage.drawingFiles.insert(item)
      setFiles(prev => [item, ...prev])
    } catch (err) {
      console.error('[fileUpload:drawings]', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`파일 업로드에 실패했습니다.\n${msg}`)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(f: DrawingFile) {
    if (!confirm('파일을 삭제하시겠습니까?')) return
    await fileStorage.remove('drawings', f.storagePath)
    await storage.drawingFiles.remove(f.id)
    setFiles(prev => prev.filter(x => x.id !== f.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-600">
          도면 파일 <span className="text-slate-400">{files.length}개</span>
        </span>
        <div className="flex items-center gap-2">
          {uploading && <span className="text-xs text-slate-400">업로드 중...</span>}
          <label className={`cursor-pointer bg-slate-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-800 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            + 파일 추가
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-sm text-slate-400">업로드된 도면 파일이 없습니다.</p>
          <p className="text-xs text-slate-300 mt-1">CAD(.dwg), SketchUp(.skp), 이미지, PDF 등 모든 형식 지원</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-400 text-xs">
              <tr>
                {['파일명', '유형', '크기', '업로드일', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {f.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs uppercase">
                    {f.name.split('.').pop() ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatSize(f.size)}</td>
                  <td className="px-4 py-3 text-slate-500">{f.createdAt}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <a
                      href={f.url}
                      download={f.name}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      다운로드
                    </a>
                    <button
                      onClick={() => handleDelete(f)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
