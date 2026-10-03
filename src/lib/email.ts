/* ============================================================
   KUDII — Email transport abstraction
   ------------------------------------------------------------
   This build ships with a DEVELOPMENT transport only. It records
   the message so the flow can be exercised end-to-end, but it does
   NOT deliver a real email and we never claim that it did.

   To go live, implement `EmailTransport` against a real provider
   (Resend, SendGrid, Postmark, Amazon SES …) and register it with
   `setEmailTransport()`. The rest of the app is already written
   against this interface, so nothing else has to change.
   ============================================================ */

import type { EmailMessage, EmailTemplate } from './types'
import { uid, nowISO } from './utils'

export interface OutgoingEmail {
  to: string
  template: EmailTemplate
  subject: string
  body: string
}

export interface EmailTransport {
  /** Human-readable provider name shown in diagnostics. */
  name: string
  /** true only when a real provider is wired up and delivering mail. */
  live: boolean
  send(msg: OutgoingEmail): Promise<{ ok: boolean; error?: string }>
}

/* Dev transport: records the message, never sends anything. */
const devTransport: EmailTransport = {
  name: 'dev',
  live: false,
  async send() {
    return { ok: true }
  },
}

let transport: EmailTransport = devTransport

export function setEmailTransport(next: EmailTransport) {
  transport = next
}

export function emailTransportName(): string {
  return transport.name
}

/** True only when a real, delivering email provider is configured. */
export function isLiveEmail(): boolean {
  return transport.live
}

/** Build the message record and hand it to the configured transport. */
export async function deliverEmail(msg: OutgoingEmail): Promise<EmailMessage> {
  const record: EmailMessage = {
    id: uid('eml'),
    to: msg.to,
    template: msg.template,
    subject: msg.subject,
    body: msg.body,
    status: 'queued',
    provider: transport.name,
    error: null,
    created_at: nowISO(),
    sent_at: null,
  }
  try {
    const res = await transport.send(msg)
    if (res.ok) {
      record.status = 'sent'
      record.sent_at = nowISO()
    } else {
      record.status = 'failed'
      record.error = res.error || 'Unknown transport error'
    }
  } catch (e) {
    record.status = 'failed'
    record.error = e instanceof Error ? e.message : 'Unknown transport error'
  }
  return record
}

/* ---------------- message templates ---------------- */

export function buildLoginCodeEmail(code: string): OutgoingEmail & { template: EmailTemplate } {
  return {
    to: '',
    template: 'login_verification',
    subject: 'Your KUDII sign-in code',
    body: `Use this code to sign in to KUDII: ${code}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  }
}

export function buildVerifyEmail(code: string): OutgoingEmail & { template: EmailTemplate } {
  return {
    to: '',
    template: 'verification_code',
    subject: 'Verify your KUDII email',
    body: `Welcome to KUDII. Verify your email with this code: ${code}\n\nIt expires in 10 minutes.`,
  }
}

export function buildRecoveryEmail(code: string): OutgoingEmail & { template: EmailTemplate } {
  return {
    to: '',
    template: 'recovery',
    subject: 'Reset your KUDII password',
    body: `Use this code to reset your KUDII password: ${code}\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  }
}

export function buildSecurityNotice(detail: string): OutgoingEmail & { template: EmailTemplate } {
  return {
    to: '',
    template: 'security_notification',
    subject: 'KUDII security notice',
    body: detail,
  }
}
