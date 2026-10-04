// Supabase Edge Function — notify-decision
// Emails the CUSTOMER when an admin approves or rejects their payment request.
// Only a logged-in admin who passed the authenticator step can trigger it.
// Deploy as: notify-decision (JWT verification ON). Uses the same secrets as notify-payment:
// RESEND_API_KEY, FROM_EMAIL (verified domain), APP_URL.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const RESEND = Deno.env.get('RESEND_API_KEY'), FROM = Deno.env.get('FROM_EMAIL')
    const APP = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
    if (!RESEND || !FROM) return json({ sent: false, reason: 'RESEND_API_KEY / FROM_EMAIL not set' })

    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: isAdmin } = await userClient.rpc('rr_is_admin')
    if (isAdmin !== true) return json({ error: 'Not allowed' }, 403)

    const { requestId } = await req.json()
    if (typeof requestId !== 'string') return json({ error: 'Bad request' }, 400)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: r } = await sb.from('payment_requests')
      .select('plan, billing, amount, status, user_id, businesses(name, access_ends_at)').eq('id', requestId).maybeSingle()
    if (!r || r.status === 'pending') return json({ error: 'Not decided yet' }, 400)

    const { data: u } = await sb.auth.admin.getUserById(r.user_id)
    const to = u?.user?.email
    if (!to) return json({ sent: false })
    const biz = (r as any).businesses?.name ?? 'your business'
    const until = (r as any).businesses?.access_ends_at
      ? new Date((r as any).businesses.access_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    const approved = r.status === 'approved'
    const text = approved
      ? `Good news: we received your payment of Rs ${r.amount} for the ${r.plan} plan (${r.billing}) for ${biz}.\n\nYour access is active${until ? ` until ${until}` : ''}.\n\nOpen your dashboard: ${APP}/dashboard`
      : `We could not confirm your payment of Rs ${r.amount} for ${biz}.\n\nPlease check the details and try again, or contact us: ${APP}/renew`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject: approved ? `Payment approved: ${biz}` : `Payment not confirmed: ${biz}`, text }),
    })
    return json({ sent: res.ok })
  } catch { return json({ sent: false }) }
})
