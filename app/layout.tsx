import type { Metadata } from 'next'
import Script from 'next/script'
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
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          strategy="afterInteractive"
        />
        <ConditionalSidebar />
        <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
      </body>
    </html>
  )
}
