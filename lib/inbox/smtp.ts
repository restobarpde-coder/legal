import nodemailer from 'nodemailer'

// ─── Types ────────────────────────────────────────────────────

export interface SmtpAccount {
  smtp_host:     string
  smtp_port:     number
  smtp_tls:      boolean
  username:      string
  email_address: string
  display_name:  string | null
}

export interface SendEmailParams {
  account:           SmtpAccount
  decryptedPassword: string
  to:                string[]
  subject:           string
  text:              string
  html?:             string
  inReplyTo?:        string   // Message-ID of the email being replied to
  references?:       string[] // Full References chain for threading
}

export interface SendEmailResult {
  messageId: string
}

// ─── Send ─────────────────────────────────────────────────────

/**
 * Sends an email via SMTP.
 * decryptedPassword is used only within this call and is never logged.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const {
    account,
    decryptedPassword,
    to,
    subject,
    text,
    html,
    inReplyTo,
    references,
  } = params

  const transporter = nodemailer.createTransport({
    host:   account.smtp_host,
    port:   account.smtp_port,
    secure: account.smtp_tls,
    auth: {
      user: account.username,
      pass: decryptedPassword,
    },
    // Suppress debug output that could include credentials
    logger: false,
    debug:  false,
  })

  const from = account.display_name
    ? `"${account.display_name}" <${account.email_address}>`
    : account.email_address

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to:      to.join(', '),
    subject,
    text,
    ...(html        ? { html }                           : {}),
    ...(inReplyTo   ? { inReplyTo }                      : {}),
    ...(references?.length ? { references: references.join(' ') } : {}),
  }

  const info = await transporter.sendMail(mailOptions)

  return { messageId: info.messageId }
}

/**
 * Prefixes "Re: " to a subject if not already present.
 */
export function replySubject(original: string | null): string {
  const s = original ?? '(sin asunto)'
  return s.startsWith('Re:') ? s : `Re: ${s}`
}
