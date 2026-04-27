import type { Metadata } from 'next'
import './globals.css'
import ConditionalSidebar from './components/ConditionalSidebar'

export const metadata: Metadata = {
  title: '다움인테리어 업무관리',
  description: '다움인테리어 업무관리 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full flex bg-gray-50 text-gray-900">
        <ConditionalSidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </body>
    </html>
  )
}
