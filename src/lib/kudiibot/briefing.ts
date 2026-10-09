/* ============================================================
   KUDIIBot — Business Entry Briefing
   The chief-of-staff greeting shown once per session when the
   owner enters. It states where the business stands and the few
   things worth doing now. It never repeats on navigation.
   ============================================================ */

import type { DB, Business } from '../types'
import { moneySummary, outstanding, todayActivity } from '../derive'
import { formatMoney, startOfMonth, greeting } from '../utils'
import { buildInsights } from './insights'
import type { Briefing, BriefingMetric } from './types'

function monthRange() {
  return { from: startOfMonth(), to: new Date().toISOString() }
}

export function buildBriefing(db: DB, biz: Business, userName?: string): Briefing {
  const insights = buildInsights(db, biz)
  const m = moneySummary(db, biz.id, monthRange())
  const o = outstanding(db, biz.id)
  const today = todayActivity(db, biz.id)

  const metrics: BriefingMetric[] = [
    { label: 'In this month', value: formatMoney(m.moneyIn, biz.currency), tone: 'positive' },
    { label: 'Out this month', value: formatMoney(m.moneyOut, biz.currency), tone: 'warning' },
    { label: 'Net', value: formatMoney(m.net, biz.currency), tone: m.net >= 0 ? 'positive' : 'critical' },
    { label: 'Owed to you', value: formatMoney(o.total, biz.currency), tone: o.total > 0 ? 'warning' : 'neutral' },
  ]

  const priorities = insights.slice(0, 4)
  const quiet = priorities.length === 0

  const lines: string[] = []
  if (m.moneyIn === 0 && m.moneyOut === 0 && o.total === 0) {
    lines.push('Nothing has moved yet this month. The moment you record a sale or a payment, KUDII starts watching your numbers.')
  } else {
    if (o.total > 0) lines.push(`${formatMoney(o.total, biz.currency)} is owed to you across ${o.count} ${o.count === 1 ? 'account' : 'accounts'}.`)
    if (m.net >= 0 && m.moneyIn > 0) lines.push(`You are keeping ${formatMoney(m.net, biz.currency)} so far this month.`)
    if (today.length) lines.push(`${today.length} ${today.length === 1 ? 'thing happened' : 'things happened'} in your business today.`)
  }

  let headline: string
  if (quiet) {
    headline = 'Everything looks steady. Nothing needs you right now.'
  } else {
    const worst = priorities.find((p) => p.tone === 'critical') || priorities[0]
    headline = worst.title
  }

  const first = (userName || '').trim().split(/\s+/)[0]
  const g = greeting()

  return {
    greeting: first ? `${g}, ${first}.` : `${g}.`,
    headline,
    lines,
    metrics,
    priorities,
    quiet,
  }
}
