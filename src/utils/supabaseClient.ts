import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// ── Config diagnostics ─────────────────────────────────────────────
// If these env vars are missing at BUILD time (not just runtime),
// createClient() throws immediately when this module loads. Since
// App.tsx imports this file at the top level, that throw used to
// crash the entire React tree before anything could render — landing
// page included. That produced a confusing "site half-works" symptom
// with no visible error.
//
// Fix: never let createClient() throw. Fall back to a harmless
// placeholder so the app always renders, and surface a clear,
// human-readable message anywhere real auth is attempted instead.
// The demo account (below) is unaffected either way — it never
// touches this client.
function describeConfigError(): string | null {
  const missing: string[] = []
  if (!SUPABASE_URL)  missing.push('VITE_SUPABASE_URL')
  if (!SUPABASE_ANON) missing.push('VITE_SUPABASE_ANON_KEY')
  if (missing.length === 0) return null
  return `Sign-in isn't configured: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} missing. Add ${missing.length > 1 ? 'them' : 'it'} in your hosting platform's environment variable settings, then trigger a fresh deploy — Vite bakes these values in at build time, so adding them alone isn't enough.`
}

export const SUPABASE_CONFIG_ERROR = describeConfigError()

export const supabase = createClient(
  SUPABASE_URL  || 'https://placeholder.invalid',
  SUPABASE_ANON || 'placeholder-anon-key',
)

// ─────────────────────────────────────────────────────────────────
// AUTH — real Supabase Auth.
// Passwords are hashed and verified server-side by Supabase; the
// client never sees or stores a password after the auth call.
// Sessions are real signed JWTs, not strings a user can fabricate
// in devtools. Row Level Security on `businesses` (see
// supabase_setup.sql) ties every row to auth.uid(), so one user
// genuinely cannot read or write another user's data even with
// the anon key — it isn't just hidden by app-level filtering.
//
// One exception: a single hardcoded demo account (below) that lets
// people explore a populated dashboard without signing up. It is
// NOT a real Supabase Auth user and NEVER touches the businesses
// table — it only renders local mock data. It cannot be used to
// access or tamper with any real user's data.
// ─────────────────────────────────────────────────────────────────

const DEMO_EMAIL    = 'demo@reviewradar.com'
const DEMO_PASSWORD = 'demo1234'
const DEMO_ID       = 'mock_user_demo_001'
const DEMO_SESSION_KEY = 'rr_demo_session'

// ── Input validation (defense-in-depth) ───────────────────────────
// Supabase's client library parameterizes every query, so classic
// SQL injection isn't reachable through normal use of `.from()`.
// These checks exist as a second layer anyway: they stop malformed
// or oversized input, obvious script-injection payloads in profile
// fields, and email values that aren't really emails, before
// anything is sent to Supabase or rendered back into the DOM.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UNSAFE_INPUT_RE = /<\s*script|javascript:|on\w+\s*=/i

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim()) && email.length <= 254
}

export function sanitizeText(input: string, maxLen = 200): string {
  return input.trim().replace(UNSAFE_INPUT_RE, '').slice(0, maxLen)
}

function assertSafe(value: string, fieldName: string) {
  if (UNSAFE_INPUT_RE.test(value)) {
    throw new Error(`${fieldName} contains characters that aren't allowed.`)
  }
}

export interface AuthMeta {
  full_name: string
  country: string
  business_type: string
}

/** Sign up — real Supabase Auth (email confirmation must be OFF in project settings) */
export async function realSignUp(email: string, password: string, meta: AuthMeta) {
  const cleanEmail = email.trim().toLowerCase()

  if (SUPABASE_CONFIG_ERROR) {
    return { session: null, error: { message: SUPABASE_CONFIG_ERROR } }
  }
  if (!isValidEmail(cleanEmail)) {
    return { session: null, error: { message: 'Please enter a valid email address.' } }
  }
  if (password.length < 8) {
    return { session: null, error: { message: 'Password must be at least 8 characters.' } }
  }
  try {
    assertSafe(meta.full_name, 'Full name')
    assertSafe(meta.country, 'Country')
    assertSafe(meta.business_type, 'Business type')
  } catch (e: any) {
    return { session: null, error: { message: e.message } }
  }

  const cleanMeta = {
    full_name: sanitizeText(meta.full_name, 100),
    country: sanitizeText(meta.country, 60),
    business_type: sanitizeText(meta.business_type, 60),
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: cleanMeta },
  })

  if (error) return { session: null, error: { message: friendlyAuthError(error.message) } }
  if (!data.session) {
    // Email confirmation is still ON in the Supabase project — surface that clearly
    // rather than letting the user think sign-up silently failed.
    return { session: null, error: { message: 'Account created, but email confirmation is still required. Turn off "Confirm email" in Supabase → Authentication → Providers → Email, then sign in.' } }
  }
  return { session: data.session, error: null }
}

/** Sign in — real Supabase Auth, with a hardcoded demo-account bypass */
export async function realSignIn(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()

  if (cleanEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
    return signInDemo()
  }

  if (SUPABASE_CONFIG_ERROR) {
    return { session: null, error: { message: SUPABASE_CONFIG_ERROR } }
  }

  if (!isValidEmail(cleanEmail)) {
    return { session: null, error: { message: 'Please enter a valid email address.' } }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (error) return { session: null, error: { message: friendlyAuthError(error.message) } }
  return { session: data.session, error: null }
}

function friendlyAuthError(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (msg.includes('user already registered')) return 'An account with this email already exists.'
  if (msg.includes('email not confirmed')) return 'Please confirm your email before signing in, or ask the site owner to disable email confirmation for testing.'
  if (msg.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.'
  return raw
}

// ── Demo account — local only, never touches Supabase Auth or DB ──
function signInDemo() {
  const user = {
    id: DEMO_ID,
    email: DEMO_EMAIL,
    role: 'authenticated',
    created_at: new Date().toISOString(),
    user_metadata: { full_name: 'Demo User', country: 'India', business_type: 'Restaurant / Cafe' },
  }
  const session = {
    access_token: 'demo_local_token',
    refresh_token: 'demo_local_refresh',
    expires_in: 86400,
    token_type: 'bearer',
    user,
  }
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session))
  seedDemoBusiness()
  window.dispatchEvent(new Event('rr_login'))
  return { session, error: null }
}

const DEMO_BIZ = {
  place_id:  'ChIJWXVE9FqvgTkRz2FJHcAe2y0',
  name:      'The Coffee Concept Jabalpur',
  address:   'Wright Town, Jabalpur, Madhya Pradesh',
  rating:    4.5,
  platforms: ['google'],
}

function seedDemoBusiness() {
  // Always overwrite: removes any old fake demo business saved by earlier versions.
  localStorage.setItem('rr_local_business_' + DEMO_ID, JSON.stringify([DEMO_BIZ]))
}

/** Sign out — clears both real Supabase session and demo session */
export async function realSignOut() {
  localStorage.removeItem(DEMO_SESSION_KEY)
  try { await supabase.auth.signOut() } catch { /* already signed out */ }
  window.dispatchEvent(new Event('rr_logout'))
}

/** Get current session — checks demo session first, then real Supabase session */
export async function getRealSession() {
  const demoRaw = localStorage.getItem(DEMO_SESSION_KEY)
  if (demoRaw) {
    try { return JSON.parse(demoRaw) } catch { localStorage.removeItem(DEMO_SESSION_KEY) }
  }
  try {
    const { data } = await supabase.auth.getSession()
    return data.session
  } catch {
    return null
  }
}

// Keep old names as aliases so nothing else in the app needs to change
// its imports — same behavior, real backing implementation now.
export const localSignUp    = realSignUp
export const localSignIn    = realSignIn
export const localSignOut   = realSignOut
export const getLocalSession = getRealSession

// ── Business persistence (per real authenticated user) ────────────

export interface SavedBusiness {
  place_id:  string
  name:      string
  address:   string
  rating:    number
  platforms: string[]
  maps_url?: string
  slug?: string
  access_starts_at?: string | null
  access_ends_at?: string | null
  id?: string
  plan?: string | null
  billing?: string | null
}

const LOCAL_ALL_BIZ = 'rr_all_businesses'
const LOCAL_BIZ      = 'rr_local_business'

function isDemoUser(userId: string) {
  return userId === DEMO_ID
}

// Local storage can end up holding data shaped by an older version of
// this app (e.g. a single object instead of a list). Reading that back
// blindly is what caused "businesses.find is not a function" crashes.
// This always returns a real array — and wipes the bad key so it can't
// keep breaking future page loads.
function safeReadBusinessArray(key: string): SavedBusiness[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall through */ }
  localStorage.removeItem(key) // corrupted / outdated shape — self-heal
  return []
}

export async function saveBusinesses(userId: string, bizList: SavedBusiness[]) {
  for (const biz of bizList) {
    assertSafe(biz.name, 'Business name')
    assertSafe(biz.address, 'Address')
  }

  // Demo account is local-only by design — never written to Supabase.
  if (isDemoUser(userId)) {
    localStorage.setItem(LOCAL_BIZ + '_' + userId, JSON.stringify(bizList))
    return
  }

  // Real users: Supabase is the source of truth, protected by Row
  // Level Security (see supabase_setup.sql) so this upsert can only
  // ever affect rows where user_id = auth.uid().
  for (const biz of bizList) {
    const { error } = await supabase.from('businesses').upsert({
      user_id:   userId,
      place_id:  biz.place_id,
      name:      sanitizeText(biz.name, 150),
      address:   sanitizeText(biz.address, 200),
      rating:    biz.rating,
      platforms: biz.platforms,
      // Only send when present, so re-saving never wipes a stored link.
      ...(biz.maps_url ? { maps_url: sanitizeText(biz.maps_url, 600) } : {}),
      ...((/^ChIJ[\w-]{10,}$/.test(biz.place_id) || biz.maps_url?.match(/ChIJ[\w-]{10,}/))
        ? { google_place_id: /^ChIJ/.test(biz.place_id) ? biz.place_id : biz.maps_url!.match(/ChIJ[\w-]{10,}/)![0] } : {}),
    }, { onConflict: 'user_id,place_id' })
    if (error) throw error
  }
  // Local cache for instant reload, not the source of truth.
  localStorage.setItem(LOCAL_ALL_BIZ + '_' + userId, JSON.stringify(bizList))
}

export interface ScrapedReview {
  platform: 'google'
  author:   string
  rating:   number | null
  text:     string
  date:     string | null
}

// Calls the scrape-google-reviews Edge Function — the actual Apify
// token never touches this file or the browser, it lives server-side
// on the Edge Function. This costs real money per call (Apify usage
// pricing), so it's only triggered by an explicit button click, never
// automatically.
export async function scrapeGoogleReviews(placeUrl: string | undefined, maxReviews = 30, placeId?: string): Promise<{ reviews: ScrapedReview[]; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('google-review-map-scraper', {
      body: { placeUrl, maxReviews, placeId },
    })
    if (error) return { reviews: [], error: error.message }
    if (data?.error) return { reviews: [], error: data.error }
    return { reviews: data?.reviews ?? [] }
  } catch (err: any) {
    return { reviews: [], error: err?.message || 'Failed to reach the scraper function.' }
  }
}

// Reads saved reviews for one business from the `reviews` table.
// RLS (supabase_migration_reviews.sql) guarantees a user only ever
// gets reviews of their own businesses.
export async function loadReviews(userId: string, placeId: string): Promise<{ reviews: ScrapedReview[]; isDemo: boolean; error?: string }> {
  try {
    let q = supabase
      .from('reviews')
      .select('platform, author, rating, text, published_at, is_demo, businesses!inner(place_id, user_id, is_demo)')
      .eq('businesses.place_id', placeId)
    // Demo account reads the public demo business; real users only their own.
    q = isDemoUser(userId) ? q.eq('businesses.is_demo', true) : q.eq('businesses.user_id', userId)
    const { data, error } = await q.order('published_at', { ascending: false }).limit(2000)
    if (error || !Array.isArray(data)) return { reviews: [], isDemo: false, error: error?.message || 'Could not load reviews.' }
    return {
      reviews: data.map((r: any) => ({
        platform: 'google' as const,
        author:   r.author || 'Anonymous',
        rating:   r.rating ?? null,
        text:     r.text || '',
        date:     r.published_at ? String(r.published_at).slice(0, 10) : null,
      })),
      isDemo: data.length > 0 && data.every((r: any) => r.is_demo),
    }
  } catch (e: any) {
    const m = String(e?.message || '')
    return { reviews: [], isDemo: false, error: /failed to fetch|networkerror/i.test(m)
      ? "Can't reach the database. Check your internet and that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in .env (then restart npm run dev)."
      : (m || 'Could not load reviews.') }
  }
}

export async function loadBusinesses(userId: string): Promise<SavedBusiness[]> {
  if (isDemoUser(userId)) {
    const saved = safeReadBusinessArray(LOCAL_BIZ + '_' + userId).filter(b => !String(b.place_id).startsWith('mock_'))
    return saved.length ? saved : [DEMO_BIZ]
  }

  try {
    const baseCols = 'place_id, name, address, rating, platforms, maps_url, slug, access_starts_at, access_ends_at'
    let { data, error } = await supabase
      .from('businesses').select(baseCols + ', id, plan, billing')
      .eq('user_id', userId).order('created_at', { ascending: true })
    if (error) {
      // supabase_payments.sql not run yet (no plan/billing columns): fall back to the old columns.
      ;({ data, error } = await supabase
        .from('businesses').select(baseCols + ', id')
        .eq('user_id', userId).order('created_at', { ascending: true }))
    }
    if (!error && Array.isArray(data)) {
      localStorage.setItem(LOCAL_ALL_BIZ + '_' + userId, JSON.stringify(data))
      return data as unknown as SavedBusiness[]
    }
  } catch { /* fall through to local cache below */ }

  // Offline / Supabase-unreachable fallback — local cache only.
  return safeReadBusinessArray(LOCAL_ALL_BIZ + '_' + userId)
}

export async function saveBusiness(userId: string, biz: SavedBusiness) {
  const existing = await loadBusinesses(userId)
  const idx = existing.findIndex(b => b.place_id === biz.place_id)
  if (idx >= 0) existing[idx] = biz
  else existing.push(biz)
  await saveBusinesses(userId, existing)
}

export async function loadBusiness(userId: string): Promise<SavedBusiness | null> {
  const list = await loadBusinesses(userId)
  return list.length > 0 ? list[0] : null
}

// ── NFC tap gate helpers ──────────────────────────────────────────
export function tapLink(slug?: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  return base && slug ? `${base}/functions/v1/tap?b=${slug}` : null
}

export async function loadTapCounts(slug?: string): Promise<{ total: number; blocked: number } | null> {
  if (!slug) return null
  try {
    const { data: biz } = await supabase.from('businesses').select('id').eq('slug', slug).maybeSingle()
    if (!biz) return null
    const { data } = await supabase.from('taps').select('allowed').eq('business_id', biz.id)
    const rows = data ?? []
    return { total: rows.length, blocked: rows.filter(r => !r.allowed).length }
  } catch { return null }
}


// ── Manual payments (no gateway) ─────────────────────────────────
export interface PaymentRequest {
  id: string; business_id: string; plan: string; billing: string; amount: number
  reference: string; note: string | null; status: 'pending' | 'approved' | 'rejected'
  created_at: string; days_granted: number | null; method?: 'upi' | 'cash'
}

export async function submitPaymentRequest(input: {
  businessId: string; plan: string; billing: string; amount: number; reference: string; note?: string; method?: 'upi' | 'cash'
}): Promise<{ id?: string; error?: string }> {
  const method = input.method === 'cash' ? 'cash' : 'upi'
  // Cash requests have no bank transaction ID, so we generate a unique reference for the admin list.
  const cashRef = () => 'CASH-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
  const reference = method === 'cash' ? cashRef() : input.reference.trim()
  if (!/^[A-Za-z0-9-]{6,40}$/.test(reference)) {
    return { error: 'Enter the transaction ID (UTR) exactly as shown in your payment app: 6 to 40 letters or numbers.' }
  }
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes?.user) return { error: 'Please sign in again.' }
  const { data, error } = await supabase.from('payment_requests').insert({
    business_id: input.businessId, user_id: userRes.user.id, plan: input.plan, billing: input.billing,
    amount: input.amount, reference, method, note: sanitizeText(input.note || '', 300) || null,
  }).select('id').single()
  if (error) {
    if ((error as any).code === '23505') return { error: 'This transaction ID was already submitted.' }
    return { error: 'Could not send your payment details. Please try again.' }
  }
  // Emails both founders (once per request). Never blocks or fails the request.
  supabase.functions.invoke('notify-payment', { body: { requestId: data.id } }).then(() => {}, () => {})
  return { id: data.id }
}

export async function loadMyPaymentRequests(businessId: string): Promise<PaymentRequest[]> {
  const { data } = await supabase.from('payment_requests')
    .select('id, business_id, plan, billing, amount, reference, note, status, created_at, days_granted, method')
    .eq('business_id', businessId).order('created_at', { ascending: false }).limit(20)
  return (data as PaymentRequest[]) || []
}

export async function isAdmin(): Promise<boolean> {
  try { const { data, error } = await supabase.rpc('rr_is_admin'); return !error && data === true } catch { return false }
}
export interface AdminRequest extends Omit<PaymentRequest, 'business_id' | 'days_granted'> { business_id: string; business_name: string; owner_email: string | null }
export interface AdminBusiness {
  id: string; name: string; slug: string | null; owner_email: string | null; plan: string | null; billing: string | null
  access_ends_at: string | null; days_left: number | null; total_taps: number; blocked_taps: number
}
export async function adminRequests(status = 'pending'): Promise<AdminRequest[]> {
  const { data } = await supabase.rpc('rr_admin_requests', { p_status: status }); return (data as AdminRequest[]) || []
}
export async function adminBusinesses(): Promise<AdminBusiness[]> {
  const { data } = await supabase.rpc('rr_admin_businesses'); return (data as AdminBusiness[]) || []
}
export async function adminGrant(businessId: string, days: number, plan?: string | null, billing?: string | null, requestId?: string | null, reason?: string | null) {
  const { error } = await supabase.rpc('rr_admin_grant', {
    p_business: businessId, p_days: days, p_plan: plan ?? null, p_billing: billing ?? null, p_request: requestId ?? null, p_reason: reason ?? null,
  })
  return error ? error.message : null
}
export async function adminReject(requestId: string) {
  const { error } = await supabase.rpc('rr_admin_reject', { p_request: requestId })
  return error ? error.message : null
}

// Emails the customer after an admin approves/rejects. Never blocks the admin.
export function notifyDecision(requestId: string) {
  supabase.functions.invoke('notify-decision', { body: { requestId } }).then(() => {}, () => {})
}

// ── Admin log + 2-step login (authenticator app) ─────────────────
export interface AdminLogRow { created_at: string; business_name: string; admin_email: string | null; days: number; reason: string | null }
export async function adminLog(): Promise<AdminLogRow[]> {
  const { data } = await supabase.rpc('rr_admin_log'); return (data as AdminLogRow[]) || []
}
// True if this user is on the admin list (says nothing about whether they passed the second step).
export async function adminCandidate(): Promise<boolean> {
  try { const { data, error } = await supabase.rpc('rr_is_admin_candidate'); return !error && data === true } catch { return false }
}
export async function mfaState(): Promise<{ level: string | null; factorId: string | null }> {
  const { data: a } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: f } = await supabase.auth.mfa.listFactors()
  return { level: a?.currentLevel ?? null, factorId: f?.totp?.[0]?.id ?? null }
}
export async function mfaEnroll(): Promise<{ factorId?: string; qr?: string; secret?: string; error?: string }> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `ReviewRadar admin ${Date.now()}` })
  if (error || !data) return { error: error?.message || 'Could not start setup.' }
  return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}
export async function mfaVerify(factorId: string, code: string): Promise<string | null> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  return error ? error.message : null
}
