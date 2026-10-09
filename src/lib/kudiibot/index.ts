/* ============================================================
   KUDIIBot — public surface
   ============================================================ */
export * from './types'
export { buildInsights, insightsByCategory, attentionCount } from './insights'
export { buildBriefing } from './briefing'
export { parseCapture, commitDraft, amountFromInput } from './nlu'

export const SOURCE_LABEL: Record<string, string> = {
  known: 'From your records',
  calculated: 'Calculated',
  interpretation: 'KUDII’s read',
  estimate: 'Estimate',
  recommendation: 'Suggestion',
}

export const CATEGORY_LABEL: Record<string, string> = {
  get_paid: 'Get paid',
  protect_profit: 'Protect profit',
  save_customer: 'Save the customer',
  protect_stock: 'Protect stock',
  understand_month: 'Understand the month',
  do_today: 'Do today',
}
