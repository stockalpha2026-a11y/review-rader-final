// Real analysis of real reviews. No AI call, no mock data: everything here is
// computed from the reviews themselves, so the numbers are explainable.
//   sentiment: 4-5 stars = positive, 3 = neutral, 1-2 = negative
//   score    : % of reviews that are positive
//   themes   : keyword groups counted inside review text

export interface AnalysedReview {
  id: string; author: string; rating: number; platform: string
  date: string; text: string; fake_signal?: string | null
}

const THEMES: { key: string; label: string; re: RegExp; fix: string }[] = [
  { key: 'coffee',   label: 'Coffee & drinks',  re: /coffee|latte|cappuccino|espresso|mocha|brew|americano|frapp|shake|mocktail|tea\b|beverage|drink/i,
    fix: 'Review the drinks menu and brewing consistency: coffee quality shows up in complaints.' },
  { key: 'food',     label: 'Food & taste',      re: /food|pizza|pasta|burger|sandwich|taste|tasty|dish|snack|fries|momos|maggi|dessert|cake|brownie|waffle|quantity|portion/i,
    fix: 'Taste-test the most-complained dishes with the kitchen and check portion size against price.' },
  { key: 'ambience', label: 'Ambience & seating', re: /ambien|vibe|atmosphere|decor|interior|cozy|music|seating|view|aesthetic|crowd|noise|noisy|\bAC\b|space|parking/i,
    fix: 'Look at seating comfort, noise, music and parking: ambience comes up in critical reviews.' },
  { key: 'service',  label: 'Service & staff',   re: /service|staff|waiter|server|manager|behaviou?r|rude|polite|attentive|hospitality|ignored|owner/i,
    fix: 'Run a short staff briefing on greeting, order accuracy and handling complaints.' },
  { key: 'price',    label: 'Price & value',     re: /price|pricey|expensive|costly|overpriced|value for money|worth|cheap|affordable|pocket|rates?\b/i,
    fix: 'Check pricing against portion size and nearby cafes; consider a value combo.' },
  { key: 'wait',     label: 'Waiting time',      re: /\bwait|slow|late\b|delay|took (too )?long|\bhour\b|forever/i,
    fix: 'Track order-to-table time at peak hours and add a runner or prep station if it is long.' },
  { key: 'clean',    label: 'Cleanliness',       re: /clean|dirty|hygien|smell|washroom|restroom|toilet|hair\b|insect|\bfly\b|flies/i,
    fix: 'Do a hygiene walk-through (tables, washrooms, kitchen) and fix anything customers mention.' },
]

export const sentimentOf = (rating: number) => rating >= 4 ? 'positive' : rating === 3 ? 'neutral' : 'negative'
const hasText = (r: AnalysedReview) => r.text && !r.text.startsWith('No written comment')
const ageDays = (r: AnalysedReview) => { const t = Date.parse(r.date); return isNaN(t) ? Infinity : (Date.now() - t) / 86400000 }
const firstName = (n: string) => (n || 'there').split(/\s+/)[0].replace(/[^\p{L}\p{N}'-]/gu, '') || 'there'

function themeCounts(rs: AnalysedReview[]) {
  return THEMES
    .map(t => ({ ...t, n: rs.filter(r => hasText(r) && t.re.test(r.text)).length }))
    .filter(t => t.n > 0)
    .sort((a, b) => b.n - a.n)
}

export function buildReport(reviews: AnalysedReview[], platformLabel = 'Google Reviews') {
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const total = reviews.length
  const pos = reviews.filter(r => r.rating >= 4).length
  const score = total ? Math.round((pos / total) * 100) : 0
  const avg = total ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0

  const positives = reviews.filter(r => r.rating >= 4 && hasText(r))
  const critical  = reviews.filter(r => r.rating <= 3 && hasText(r))
  const praise = themeCounts(positives).slice(0, 3)
  const gripes = themeCounts(critical).slice(0, 3)

  const top_praise = praise.length
    ? praise.map(t => `${t.label}: mentioned in ${t.n} of ${positives.length} positive written reviews (${Math.round(t.n / positives.length * 100)}%)`)
    : ['Not enough written positive reviews yet to find a pattern.']
  const top_complaints = gripes.length
    ? gripes.map(t => `${t.label}: mentioned in ${t.n} of ${critical.length} critical written reviews (${Math.round(t.n / critical.length * 100)}%)`)
    : ['No recurring complaint theme found in the written reviews.']

  const recentNeg = reviews.filter(r => r.rating <= 2 && ageDays(r) <= 90).sort((a, b) => b.date.localeCompare(a.date))
  const urgent_alerts = recentNeg.slice(0, 3).map(r => ({
    author: r.author,
    rating: r.rating,
    issue: hasText(r) ? (r.text.length > 160 ? r.text.slice(0, 157) + '…' : r.text) : `${r.rating}★ rating with no comment (${r.date})`,
  }))

  const replyTargets = (recentNeg.length ? recentNeg : reviews.filter(r => r.rating <= 3 && hasText(r)).sort((a, b) => b.date.localeCompare(a.date))).slice(0, 2)
  const suggested_replies = replyTargets.map(r => {
    const t = themeCounts([r])[0]
    const about = t ? ` We're taking your feedback on ${t.label.toLowerCase()} seriously and sharing it with our team.` : ' We are sharing your feedback with our team.'
    return { author: r.author, draft: `Hi ${firstName(r.author)}, thank you for taking the time to review us, and we're sorry your visit fell short of what you expected.${about} We'd really like the chance to make it right. Please message us and we'll look into it personally.` }
  })

  const action_items: string[] = []
  if (urgent_alerts.length) action_items.push(`Reply to ${urgent_alerts.length} recent low-star review${urgent_alerts.length > 1 ? 's' : ''} (last 90 days). Fast replies protect your rating.`)
  gripes.slice(0, 2).forEach(t => action_items.push(t.fix))
  const unanswered5 = reviews.filter(r => r.rating === 5 && hasText(r) && ageDays(r) <= 30).length
  if (unanswered5) action_items.push(`Thank the ${unanswered5} customers who left 5★ written reviews in the last 30 days.`)
  if (!action_items.length) action_items.push('Nothing urgent. Keep replying to new reviews as they arrive.')

  return {
    date, sentiment_score: score, avg_rating: avg, new_reviews_today: 0,
    top_praise, top_complaints, urgent_alerts, suggested_replies, action_items,
    platform_breakdown: [{ platform: platformLabel, mentions: total, sentiment: score }],
  }
}

// Weekly buckets (Monday start), most recent `weeks` weeks ending this week.
export function weeklyBuckets(reviews: AnalysedReview[], weeks = 12) {
  const startOfWeek = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
  const thisWeek = startOfWeek(new Date())
  const out: { label: string; start: number; count: number; avg: number; positivePct: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(thisWeek); s.setDate(s.getDate() - i * 7)
    out.push({ label: s.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), start: s.getTime(), count: 0, avg: 0, positivePct: 0 })
  }
  const sums = out.map(() => ({ stars: 0, pos: 0 }))
  for (const r of reviews) {
    const t = Date.parse(r.date); if (isNaN(t)) continue
    const idx = out.findIndex((b, i) => t >= b.start && (i === out.length - 1 || t < out[i + 1].start))
    if (idx < 0) continue
    out[idx].count++; sums[idx].stars += r.rating; if (r.rating >= 4) sums[idx].pos++
  }
  out.forEach((b, i) => { if (b.count) { b.avg = Math.round(sums[i].stars / b.count * 10) / 10; b.positivePct = Math.round(sums[i].pos / b.count * 100) } })
  return out
}
