// Supabase Edge Function — tap
// The NFC card is programmed with:  https://<project>.supabase.co/functions/v1/tap?b=<slug>
//
// On every tap: look up the business, check the access window, log the tap,
// then 302-redirect to either Google's "write a review" page (active) or the
// ReviewRadar "expired" page (inactive). Review content is never touched.
//
// Deploy (must be public, no login on a customer's phone):
//   supabase functions deploy tap --no-verify-jwt
//   supabase secrets set APP_URL=https://your-app.vercel.app
//
// NOTE: Supabase blocks HTML pages served from its default domain, so the
// "expired" screen is a React page in the app (/expired) and we redirect to it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL      = (Deno.env.get('APP_URL') || '').replace(/\/$/, '')

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } })
}

function googleReviewUrl(biz: { google_place_id: string | null; maps_url: string | null }): string | null {
  let pid = biz.google_place_id
  if (!pid && biz.maps_url) {
    const m = biz.maps_url.match(/ChIJ[\w-]{10,}/)  // some Maps URLs embed the Place ID
    if (m) pid = m[0]
  }
  if (pid) return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(pid)}`
  return biz.maps_url || null  // fallback: opens the business's Maps page
}

Deno.serve(async (req) => {
  const slug = new URL(req.url).searchParams.get('b')?.trim().toLowerCase()
  const expired = (name = '') => redirect(`${APP_URL}/expired${name ? `?n=${encodeURIComponent(name)}` : ''}`)
  if (!slug) return expired()

  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, google_place_id, maps_url, access_starts_at, access_ends_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!biz) return expired()

  const now = Date.now()
  const startOk = !biz.access_starts_at || new Date(biz.access_starts_at).getTime() <= now
  const endOk   = !!biz.access_ends_at && new Date(biz.access_ends_at).getTime() > now
  const target  = googleReviewUrl(biz)
  const allowed = startOk && endOk && !!target

  // Log, but never let a logging failure slow down or break the redirect.
  admin.from('taps').insert({
    business_id: biz.id, allowed, user_agent: (req.headers.get('user-agent') || '').slice(0, 200),
  }).then(() => {}, () => {})

  return allowed ? redirect(target!) : expired(biz.name)
})
