import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://daum-platform.vercel.app'

export async function POST(req: NextRequest) {
  const { to, subject, html } = await req.json()

  if (!to || !subject || !html) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    return NextResponse.json({ error: '이메일 환경변수 미설정' }, { status: 500 })
  }

  // localhost URL → 실제 배포 주소로 치환
  const finalHtml = (html as string).replace(/https?:\/\/localhost:\d+/g, BASE_URL)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `다움인테리어 <${user}>`,
      to,
      subject,
      html: finalHtml,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-email]', err)
    return NextResponse.json({ error: '발송 실패' }, { status: 500 })
  }
}
