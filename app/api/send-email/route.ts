import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { supabase } from '../../lib/supabase'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? 'https://daum-platform.vercel.app'

export async function POST(req: NextRequest) {
  const { to, subject, html, siteId, estimateId, recipientName, sendType } =
    await req.json()

  if (!to || !subject || !html) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const user = process.env.GMAIL_USER
  const pass = process.env.SMTP_PASS

  if (!user || !pass) {
    return NextResponse.json({ error: '이메일 환경변수 미설정' }, { status: 500 })
  }

  const finalHtml = (html as string).replace(/https?:\/\/localhost:\d+/g, BASE_URL)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })

  const logBase = {
    siteId:         siteId        ?? null,
    estimateId:     estimateId    ?? null,
    recipientEmail: to,
    recipientName:  recipientName ?? null,
    subject,
    sendType:       sendType      ?? 'other',
  }

  try {
    await transporter.sendMail({
      from: `다움인테리어 <${user}>`,
      to,
      subject,
      html: finalHtml,
    })

    await supabase.from('email_logs').insert({
      ...logBase,
      status: 'success',
      errorMessage: null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[send-email]', err)

    await supabase
      .from('email_logs')
      .insert({ ...logBase, status: 'failed', errorMessage: errMsg })
      .then(({ error }) => { if (error) console.error('[email_logs:insert]', error) })

    return NextResponse.json({ error: '발송 실패' }, { status: 500 })
  }
}
