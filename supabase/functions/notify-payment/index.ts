// Supabase Edge Function — notify-payment
// Emails BOTH founders when a customer submits "I have paid" or a cash request.
// Each request is emailed only once, even if the function is called many times.
//
// Deploy with the exact name:  notify-payment   (JWT verification ON, the default)
// Secrets (Edge Functions → Secrets):
//   RESEND_API_KEY   key from resend.com
//   OWNER_EMAILS     both founders, comma-separated:  a@gmail.com,b@gmail.com
//   FROM_EMAIL       e.g. "ReviewRadar <payments@yourdomain.com>"  (needs a domain verified in Resend;
//                    without it Resend only delivers to the email you signed up with)
//   APP_URL          e.g. https://your-app.vercel.app
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const RESEND = Deno.env.get('RESEND_API_KEY')
    const TO = (Deno.env.get('OWNER_EMAILS') || Deno.env.get('OWNER_EMAIL') || '').split(',').map(s => s.trim()).filter(Boolean)
    const FROM = Deno.env.get('FROM_EMAIL') || 'ReviewRadar <onboarding@resend.dev>'
    const APP = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')
    if (!RESEND || TO.length === 0) return json({ sent: false, reason: 'RESEND_API_KEY / OWNER_EMAILS not set' })

    // Read the request AS THE LOGGED-IN USER: row-level security means they can only see their own request.
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { requestId } = await req.json()
    if (typeof requestId !== 'string') return json({ error: 'Bad request' }, 400)
    const { data: r } = await userClient.from('payment_requests')
      .select('plan, billing, amount, reference, note, method, businesses(name)').eq('id', requestId).maybeSingle()
    if (!r) return json({ error: 'Not found' }, 404)

    // Claim the request so it is emailed only once.
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: claimed } = await admin.from('payment_requests')
      .update({ notified_at: new Date().toISOString() }).eq('id', requestId).is('notified_at', null).select('id')
    if (!claimed || claimed.length === 0) return json({ sent: false, reason: 'already notified' })

    const biz = (r as any).businesses?.name ?? 'a business'
    const cash = r.method === 'cash'
    const text = [
      cash ? `New CASH payment request on ReviewRadar` : `New UPI payment to approve on ReviewRadar`,
      ``,
      `Business: ${biz}`,
      `Plan: ${r.plan} (${r.billing})`,
      `Amount: Rs ${r.amount}`,
      cash ? `Method: CASH (reference ${r.reference})` : `Transaction ID: ${r.reference}`,
      r.note ? `Note: ${r.note}` : '',
      ``,
      cash ? `1. Collect the cash from the customer first.` : `1. Check this payment in your bank/UPI app.`,
      `2. Open this request (you will log in with your password + authenticator code, then press Approve):`,
      `${APP}/admin?request=${requestId}`,
    ].filter(Boolean).join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: TO, subject: `${cash ? 'Cash request' : 'Payment to approve'}: ${biz} (Rs ${r.amount})`, text }),
    })
    if (!res.ok) await admin.from('payment_requests').update({ notified_at: null }).eq('id', requestId)  // allow a retry
    return json({ sent: res.ok })
  } catch {
    return json({ sent: false })
  }
})
