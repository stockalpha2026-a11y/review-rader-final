// Supabase Edge Function — expiry-reminders
// Called once a day by pg_cron (see the bottom of supabase_admin_v2.sql). Emails customers whose access
// expires in 7 / 3 / 1 days, and once when it has expired. Each stage is sent once per expiry date.
//
// Deploy WITHOUT JWT verification (the cron job sends a secret header instead):
//   supabase functions deploy expiry-reminders --no-verify-jwt
//   (Dashboard: Edge Functions → expiry-reminders → turn "Verify JWT" off)
// Secrets: CRON_SECRET (long random string), RESEND_API_KEY, FROM_EMAIL, APP_URL
//   FROM_EMAIL must be on a domain verified in Resend, or customers will not receive anything.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const DAY = 86400000
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

const MESSAGES: Record<string, (name: string) => { subject: string; line: string }> = {
  d7:      n => ({ subject: `${n}: your ReviewRadar plan ends in about a week`, line: `Your ReviewRadar plan for ${n} ends in about 7 days.` }),
  d3:      n => ({ subject: `${n}: your ReviewRadar plan ends in 3 days`,       line: `Your ReviewRadar plan for ${n} ends in 3 days or less.` }),
  d1:      n => ({ subject: `${n}: your ReviewRadar plan ends tomorrow`,        line: `Your ReviewRadar plan for ${n} ends within a day.` }),
  expired: n => ({ subject: `${n}: your ReviewRadar plan has ended`,            line: `Your ReviewRadar plan for ${n} has ended, so your NFC review card is paused.` }),
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Forbidden' }, 403)

  const RESEND = Deno.env.get('RESEND_API_KEY')
  const FROM = Deno.env.get('FROM_EMAIL')
  const APP = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
  if (!RESEND || !FROM) return json({ sent: 0, reason: 'RESEND_API_KEY / FROM_EMAIL not set' })

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = Date.now()
  const { data: bizs, error } = await sb.from('businesses')
    .select('id, name, user_id, access_ends_at')
    .eq('is_demo', false)
    .gte('access_ends_at', new Date(now - 3 * DAY).toISOString())
    .lte('access_ends_at', new Date(now + 7 * DAY).toISOString())
  if (error) return json({ error: 'query failed' }, 500)

  let sent = 0
  for (const b of bizs ?? []) {
    const daysLeft = Math.ceil((new Date(b.access_ends_at).getTime() - now) / DAY)
    const kind = daysLeft <= 0 ? 'expired' : daysLeft <= 1 ? 'd1' : daysLeft <= 3 ? 'd3' : 'd7'

    // Claim this stage first; if it was already sent, the insert fails and we skip.
    const { error: claimErr } = await sb.from('rr_reminders_sent').insert({ business_id: b.id, kind, access_ends_at: b.access_ends_at })
    if (claimErr) continue

    const { data: u } = await sb.auth.admin.getUserById(b.user_id)
    const email = u?.user?.email
    const m = MESSAGES[kind](b.name)
    const ok = email && (await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [email], subject: m.subject, text: `${m.line}\n\nRenew here: ${APP}/renew\n\nPay by UPI or cash, send us the details, and we activate it the same day.` }),
    })).ok
    if (ok) sent++
    else await sb.from('rr_reminders_sent').delete().eq('business_id', b.id).eq('kind', kind).eq('access_ends_at', b.access_ends_at)  // retry tomorrow
  }
  return json({ checked: bizs?.length ?? 0, sent })
})
