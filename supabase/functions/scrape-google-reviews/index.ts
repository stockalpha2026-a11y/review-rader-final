// Supabase Edge Function — scrape-google-reviews
//
// This runs on Supabase's servers, NOT in the browser. That's the whole
// point: your Apify token lives here as a secret (APIFY_API_TOKEN),
// never in frontend code where anyone could steal it from devtools.
//
// Deploy + configure (from your project root, with Supabase CLI installed):
//   supabase functions deploy scrape-google-reviews
//   supabase secrets set APIFY_API_TOKEN=your_new_rotated_token_here
//
// Call it from the app with:
//   const { data, error } = await supabase.functions.invoke('scrape-google-reviews', {
//     body: { placeUrl: 'https://www.google.com/maps/place/...', maxReviews: 30 }
//   })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const APIFY_TOKEN              = Deno.env.get('APIFY_API_TOKEN')
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!APIFY_TOKEN) {
      return json({ error: 'APIFY_API_TOKEN is not set as a secret on this function yet.' }, 500)
    }

    // Require a logged-in Supabase user — this prevents random internet
    // traffic from triggering paid Apify runs on your account. Every
    // scrape costs you real money, so this check matters.
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData?.user) {
      return json({ error: 'Not authenticated.' }, 401)
    }

    const { placeUrl: clientUrl, placeId } = await req.json()
    if (typeof placeId !== 'string' || !placeId || placeId.length > 200) {
      return json({ error: 'Missing business id.' }, 400)
    }

    // The business must belong to the logged-in user and have active access.
    // This stops people from running paid Apify scrapes on places that are not theirs,
    // or after their plan has ended.
    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    const { data: biz } = await admin
      .from('businesses')
      .select('id, maps_url, google_place_id, access_ends_at')
      .eq('user_id', userData.user.id).eq('place_id', placeId).maybeSingle()
    if (!biz) return json({ error: 'This business is not on your account.' }, 403)
    if (!biz.access_ends_at || new Date(biz.access_ends_at).getTime() < Date.now()) {
      return json({ error: 'Your plan has ended. Renew to fetch new reviews.' }, 402)
    }

    // Pick the Google target: saved long link first, then Place ID, then the link the app sent.
    const urlCandidate = [biz.maps_url, clientUrl].find((u: unknown) => typeof u === 'string' && (u as string).includes('google.com/maps')) as string | undefined
    const idCandidate  = [biz.google_place_id, placeId].find((i: unknown) => typeof i === 'string' && /^ChIJ[\w-]{10,}$/.test(i as string)) as string | undefined
    if (!urlCandidate && !idCandidate) {
      return json({ error: 'No usable Google Maps link for this business. Add its long Google Maps link (https://www.google.com/maps/place/...).' }, 400)
    }

    // First pull = full history backfill. Later pulls = only reviews newer than the latest saved one,
    // so you do not pay Apify for the same reviews again.
    const { count } = await admin.from('reviews').select('id', { count: 'exact', head: true }).eq('business_id', biz.id)
    let maxReviews = 200
    let reviewsStartDate: string | undefined
    let mode = 'backfill'
    if ((count ?? 0) > 0) {
      const { data: latest } = await admin.from('reviews').select('published_at')
        .eq('business_id', biz.id).not('published_at', 'is', null).order('published_at', { ascending: false }).limit(1).maybeSingle()
      if (latest?.published_at) {
        const d = new Date(latest.published_at); d.setUTCDate(d.getUTCDate() - 1) // 1 day overlap, duplicates are ignored
        reviewsStartDate = d.toISOString().slice(0, 10)
        maxReviews = 60
        mode = 'incremental'
      }
    }

    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/compass~google-maps-reviews-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(130_000),
        body: JSON.stringify({
          ...(urlCandidate ? { startUrls: [{ url: urlCandidate }] } : { placeIds: [idCandidate] }),
          maxReviews,
          ...(reviewsStartDate ? { reviewsStartDate } : {}),
          reviewsSort: 'newest',
          language: 'en',
          personalData: false, // don't collect reviewer personal info by default
        }),
      }
    )

    if (!apifyRes.ok) {
      const detail = await apifyRes.text()
      return json({ error: `Apify request failed (${apifyRes.status})`, detail }, 502)
    }

    const items = await apifyRes.json()

    // NOTE: Apify actor output field names can vary slightly by actor
    // version. If reviews come back empty/misaligned, log one raw item
    // (console.log(items[0]) right here) and check Supabase's Edge
    // Function logs to see the actual field names, then adjust below.
    const rows = (Array.isArray(items) ? items : []).filter((r: any) => r.reviewId)
    const reviews = rows.map((r: any) => ({
      platform: 'google',
      author:   r.name ?? r.reviewerName ?? 'Anonymous',
      rating:   r.stars ?? r.rating ?? null,
      text:     r.text ?? r.reviewText ?? '',
      date:     r.publishedAtDate ?? r.publishAt ?? null,
    }))

    // Save to the `reviews` table (service role). Ownership was already checked above.
    let stored = 0
    const records = rows
      .filter((r: any) => r.stars ?? r.rating)
      .map((r: any) => ({
        business_id:  biz.id,
        platform:     'google',
        external_id:  r.reviewId,
        author:       r.name ?? 'Anonymous',
        rating:       r.stars ?? r.rating,
        text:         (r.text ?? '').trim(),
        published_at: r.publishedAtDate ?? null,
      }))
    for (let i = 0; i < records.length; i += 200) {
      const { error } = await admin.from('reviews')
        .upsert(records.slice(i, i + 200), { onConflict: 'business_id,external_id' })
      if (error) return json({ error: `Saving reviews failed: ${error.message}` }, 500)
      stored += Math.min(200, records.length - i)
    }

    return json({ reviews, count: reviews.length, stored, mode })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
