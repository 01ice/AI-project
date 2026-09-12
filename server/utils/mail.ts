import nodemailer from 'nodemailer'

export interface MailMessage {
  to: string
  subject: string
  text: string
  html?: string
}

interface MailResult {
  delivered: boolean
  reason?: string
}

let transporter: nodemailer.Transporter | null = null

function getTransporter(user: string, pass: string, host: string, port: number) {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    })
  }
  return transporter
}

/**
 * 发送邮件。未配置 SMTP 时不会失败，而是把邮件内容打印到控制台，
 * 方便本地开发时直接复制验证链接。
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = useRuntimeConfig()
  const user = String(config.smtpUser ?? '')
  const pass = String(config.smtpPass ?? '')

  if (!user || !pass) {
    console.log('\n[mail] SMTP 未配置，邮件内容如下：')
    console.log(`  收件人：${message.to}`)
    console.log(`  主题：${message.subject}`)
    console.log(`${message.text.split('\n').map(line => `  ${line}`).join('\n')}\n`)
    return { delivered: false, reason: 'smtp-not-configured' }
  }

  try {
    await getTransporter(user, pass, String(config.smtpHost), Number(config.smtpPort)).sendMail({
      from: `栈桥 <${user}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    })
    return { delivered: true }
  }
  catch (error) {
    console.error('[mail] 发送失败：', error)
    return { delivered: false, reason: 'send-failed' }
  }
}

export function siteUrl(): string {
  return String(useRuntimeConfig().public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')
}
