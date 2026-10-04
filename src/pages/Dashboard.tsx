import { useEffect, useState } from 'react'
import NfcCard from '../components/NfcCard'
import { useNavigate, Link } from 'react-router-dom'
import { getLocalSession, localSignOut, loadBusinesses, loadReviews, scrapeGoogleReviews, adminCandidate, type SavedBusiness, type ScrapedReview } from '../utils/supabaseClient'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard, FileText, BarChart2, Settings,
  LogOut, Star, AlertCircle, Plus, TrendingUp,
  TrendingDown, MessageSquare, ChevronRight,
  ThumbsUp, ThumbsDown, Bell, Globe, ChevronDown,
  MapPin, Activity, ShieldAlert, Check
} from 'lucide-react'
import OnboardingWizard from '../components/OnboardingWizard'
import { ToastContainer, useToast } from '../components/Toast'
import { Spinner } from '../components/Loaders'
import { DashboardSkeleton, FetchingReviewsState } from '../components/Skeletons'
import { SentimentDonut } from '../components/SentimentDonut'
import { PLATFORMS } from '../utils/mockData'
import { buildReport, weeklyBuckets } from '../utils/analysis'

type DashTab = 'overview' | 'daily' | 'weekly' | 'settings'

const NAV: { label: string; tab: DashTab; icon: any }[] = [
  { label: 'Overview',      tab: 'overview', icon: LayoutDashboard },
  { label: 'Daily Report',  tab: 'daily',    icon: FileText },
  { label: 'Weekly Report', tab: 'weekly',   icon: BarChart2 },
  { label: 'Settings',      tab: 'settings', icon: Settings },
]

const PLATFORM_ICONS: Record<string, string> = {
  google: '🔍', reddit: '🟠',
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub: string; icon: any; accent?: 'teal' | 'red' | 'neutral'
}) {
  return (
    <div className="border border-neutral-200 px-5 py-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-neutral-400 font-medium">{label}</p>
        <Icon className="h-3.5 w-3.5 text-neutral-300" />
      </div>
      <p className={`text-2xl font-bold ${accent === 'teal' ? 'text-teal-dark' : accent === 'red' ? 'text-red-500' : 'text-black'}`}>{value}</p>
      <p className="text-[11px] text-neutral-400">{sub}</p>
    </div>
  )
}

function FakeSignalBadge({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 hover:bg-amber-100 transition-colors"
      >
        <ShieldAlert className="h-3 w-3" /> Possibly fake
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1.5 w-64 bg-white border border-neutral-200 shadow-lg p-3 text-[11px] text-neutral-600 leading-relaxed">
          {reason}
        </div>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: any }) {
  const stars = review.rating
  const platformIcon = PLATFORM_ICONS[review.platform] || '💬'
  return (
    <div className="border border-neutral-100 p-4 space-y-3 hover:border-neutral-300 transition-colors duration-150">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
            {review.author[0].toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-black">{review.author}</p>
            <p className="text-[10px] text-neutral-400">{review.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px]">{platformIcon}</span>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < stars ? 'fill-neutral-800 stroke-none' : 'stroke-neutral-200 fill-none'}`} />
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-neutral-600 font-light leading-relaxed">{review.text}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {stars <= 2 && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] text-red-500 uppercase tracking-widest font-semibold">Needs response</span>
          </span>
        )}
        {review.fake_signal && <FakeSignalBadge reason={review.fake_signal} />}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [user,           setUser]           = useState<User | null>(null)
  const [pageLoading,    setPageLoading]    = useState(true)
  const [bizLoading,     setBizLoading]     = useState(false)
  const [showWizard,     setShowWizard]     = useState(false)
  const [businesses,     setBusinesses]     = useState<SavedBusiness[]>([])
  const [activePlaceId,  setActivePlaceId]  = useState<string | null>(null)
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const [dashTab,        setDashTab]        = useState<DashTab>('overview')
  const [activeSubTab,   setActiveSubTab]   = useState<'overview' | 'reviews' | 'report'>('overview')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterRating,   setFilterRating]   = useState<number>(0)
  const [realReviews,    setRealReviews]    = useState<Record<string, ScrapedReview[]>>({})
  const [scraping,       setScraping]       = useState(false)
  const [scrapeError,    setScrapeError]    = useState('')
  const [isDemoData,     setIsDemoData]     = useState(false)
  const [loadError,      setLoadError]      = useState('')
  const [admin,          setAdmin]          = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  // True for the one reviews-load that happens right after the onboarding
  // wizard hands off — lets us show the "fetching your reviews" skeleton
  // instead of the plain one used for ordinary business switches/reloads.
  const [justOnboarded,  setJustOnboarded]  = useState(false)
  // Bumped after onboarding so saved reviews reload even when the same business is connected again
  // (activePlaceId would not change in that case, so the load effect would not re-run).
  const [reloadTick,     setReloadTick]     = useState(0)
  const navigate = useNavigate()
  const { toasts, dismiss, success } = useToast()

  useEffect(() => {
    getLocalSession().then(async (session) => {
      if (!session) { navigate('/login'); return }
      setUser(session.user as any)
      setBizLoading(true)
      const list = await loadBusinesses(session.user.id)
      setBusinesses(list)
      if (list.length > 0) setActivePlaceId(list[0].place_id)
      setBizLoading(false)
      setPageLoading(false)
    })
    const handleLogout = () => navigate('/login')
    window.addEventListener('rr_logout', handleLogout)
    return () => window.removeEventListener('rr_logout', handleLogout)
  }, [navigate])

  // Load saved reviews from the backend (`reviews` table) whenever the active business changes.
  useEffect(() => {
    if (!user || !activePlaceId) return
    let cancelled = false
    setReviewsLoading(true); setLoadError('')
    loadReviews(user.id, activePlaceId).then(({ reviews: saved, isDemo, error }) => {
      if (cancelled) return
      setRealReviews(prev => ({ ...prev, [activePlaceId]: saved }))
      setIsDemoData(isDemo)
      if (error) setLoadError(error)
      setReviewsLoading(false)
      setJustOnboarded(false)
    })
    return () => { cancelled = true }
  }, [user, activePlaceId, reloadTick])

  useEffect(() => {
    if (user && !String(user.id).startsWith('mock_user')) adminCandidate().then(setAdmin)
  }, [user])

  const signOut = async () => { await localSignOut(); navigate('/') }

  const handleOnboardingComplete = (biz: any) => {
    setBusinesses(prev => {
      const exists = prev.some(b => b.place_id === biz.place_id)
      return exists ? prev.map(b => b.place_id === biz.place_id ? biz : b) : [...prev, biz]
    })
    setActivePlaceId(biz.place_id)
    setJustOnboarded(true)
    setReloadTick(t => t + 1)
    setShowWizard(false)
    success('Business connected!', `Now monitoring ${biz.name} across ${biz.platforms?.length || 1} platform(s).`)
    // The wizard itself already fetched (and the Edge Function already
    // saved) the first batch of reviews before calling onComplete — that's
    // what its own loading screen was waiting on. Setting activePlaceId
    // above triggers the loadReviews effect, which reads those saved rows.
    // Calling fetchFor here too would fire a second, paid Apify scrape for
    // no reason.
  }

  const business = (Array.isArray(businesses) ? businesses : []).find(b => b.place_id === activePlaceId) || null

  const scrapedForBiz   = business ? (realReviews[business.place_id] || []) : []
  const reviews         = scrapedForBiz.map((r, i) => ({
    id: `real-${i}`, author: r.author, rating: r.rating ?? 0, platform: r.platform,
    date: r.date || 'Unknown date', text: r.text || 'No written comment (star rating only).', fake_signal: null as string | null,
  }))
  const report: any     = business ? buildReport(reviews) : null
  const activePlatforms = business?.platforms || []

  const isDemoSession = String(user?.id || '').startsWith('mock_user')

  const fetchFor = async (biz: SavedBusiness, auto = false) => {
    if (isDemoSession) {
      setScrapeError('This is the demo account: its reviews are fixed sample data. Sign up to connect your own business.')
      return
    }
    const canScrape = !!biz.maps_url || biz.place_id.startsWith('ChIJ')
    if (!canScrape) {
      setScrapeError('No Google Maps link saved for this business yet. Add it again with its Google Maps link in the wizard.')
      return
    }
    setScraping(true)
    setScrapeError('')
    if (auto) success('Fetching your reviews…', 'The first pull of your Google review history takes up to a minute.')
    const { reviews: fetched, error } = await scrapeGoogleReviews(biz.maps_url, 30, biz.place_id)
    setScraping(false)
    if (error) { setScrapeError(error); return }
    // The function saved them to the backend; reload the full saved history.
    const saved = user ? await loadReviews(user.id, biz.place_id) : { reviews: [], isDemo: false }
    setRealReviews(prev => ({ ...prev, [biz.place_id]: saved.reviews.length ? saved.reviews : fetched }))
    setIsDemoData(saved.isDemo)
    success('Reviews updated', saved.reviews.length ? `${saved.reviews.length} reviews saved for ${biz.name}.` : `Pulled ${fetched.length} review${fetched.length !== 1 ? 's' : ''} from Google.`)
  }

  const handleRefreshReviews = () => { if (business) fetchFor(business) }

  const filteredReviews = reviews.filter(r => {
    if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false
    if (filterRating > 0 && r.rating !== filterRating) return false
    return true
  })

  const sentScore = report?.sentiment_score || 0
  const avgRating = reviews.length ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : '—'

  const goodCount   = reviews.filter((r: any) => r.rating >= 4).length
  const mediumCount = reviews.filter((r: any) => r.rating === 3).length
  const badCount    = reviews.filter((r: any) => r.rating <= 2).length
  const flaggedCount = reviews.filter((r: any) => !!r.fake_signal).length

  const displayName = (() => {
    const meta = (user as any)?.user_metadata
    if (meta?.full_name) return meta.full_name.split(' ')[0]
    return user?.email?.split('@')[0] || 'there'
  })()

  if (pageLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <Spinner size="md" label="Loading ReviewRadar…" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── SIDEBAR ──────────────────────────────── */}
      <aside className="w-56 border-r border-neutral-100 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="h-16 px-5 flex items-center border-b border-neutral-100">
          <Link to="/" className="font-bold text-black text-sm tracking-tight flex items-center gap-1.5">
            ReviewRadar <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-0.5">
          {NAV.map(({ label, tab, icon: Icon }) => {
            const active = dashTab === tab
            return (
              <button
                key={tab}
                onClick={() => setDashTab(tab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors duration-150 ${active ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-500 hover:text-black hover:bg-neutral-50'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />{label}
              </button>
            )
          })}
        </nav>

        {/* Location switcher */}
        {businesses.length > 0 && (
          <div className="mx-3 mb-3 relative">
            <button
              onClick={() => setLocationMenuOpen(o => !o)}
              className="w-full p-3 bg-teal/5 border border-teal/20 space-y-2 text-left hover:border-teal/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold flex items-center gap-1.5">
                  <Activity className="h-3 w-3" /> Live monitoring
                </p>
                {businesses.length > 1 && <ChevronDown className={`h-3 w-3 text-teal transition-transform ${locationMenuOpen ? 'rotate-180' : ''}`} />}
              </div>
              <p className="text-xs font-semibold text-black truncate">{business?.name}</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                <p className="text-[10px] text-neutral-400 truncate">{business?.address}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {activePlatforms.slice(0, 3).map((pid) => {
                  const p = PLATFORMS.find((pl) => pl.id === pid)
                  return p ? (
                    <span key={pid} className="text-[9px] bg-white border border-teal/20 text-teal-dark px-1.5 py-0.5 font-medium">
                      {p.icon} {p.label.split(' ')[0]}
                    </span>
                  ) : null
                })}
              </div>
            </button>

            {locationMenuOpen && businesses.length > 1 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-neutral-200 shadow-lg max-h-56 overflow-y-auto z-30">
                {businesses.map(b => (
                  <button
                    key={b.place_id}
                    onClick={() => { setActivePlaceId(b.place_id); setLocationMenuOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-neutral-50 transition-colors ${b.place_id === activePlaceId ? 'font-semibold text-black bg-neutral-50' : 'text-neutral-600'}`}
                  >
                    {b.place_id === activePlaceId ? <Check className="h-3 w-3 text-teal shrink-0" /> : <span className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{b.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-5 border-t border-neutral-100 space-y-2">
          <p className="text-[11px] text-neutral-400 truncate">{user?.email}</p>
          {!String(user?.id || '').startsWith('mock_user') && (
            <Link to="/renew" className="block text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors font-medium">Renew / payments</Link>
          )}
          {admin && <Link to="/admin" className="block text-[11px] uppercase tracking-widest text-teal-dark hover:text-black transition-colors font-semibold">Admin</Link>}
          <button onClick={signOut} className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors font-medium">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-neutral-100 px-10 h-14 flex items-center justify-between z-20">
          <div>
            <h1 className="text-sm font-bold text-black tracking-tight">
              Good morning, {displayName}
            </h1>
            {business && <p className="text-[11px] text-neutral-400">{business.name} · {report?.date}{isDemoData && <span className="ml-2 text-[10px] uppercase tracking-widest font-semibold text-amber-600">Sample data</span>}</p>}
          </div>
          <div className="flex items-center gap-3">
            {business && (
              <button
                onClick={handleRefreshReviews}
                disabled={scraping}
                title={business.maps_url ? 'Fetch the latest real Google reviews' : 'Add a Google Maps URL to enable this'}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-neutral-500 hover:text-black border border-neutral-200 hover:border-black px-2.5 py-1.5 transition-colors disabled:opacity-50"
              >
                {scraping ? <><Spinner size="sm" /><span>Fetching…</span></> : <><Activity className="h-3 w-3" /><span>Refresh reviews</span></>}
              </button>
            )}
            {business && (
              <button className="relative p-2 text-neutral-400 hover:text-black transition-colors">
                <Bell className="h-4 w-4" />
                {report?.urgent_alerts?.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full" />
                )}
              </button>
            )}
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              {businesses.length > 0 ? 'Add location' : 'Connect business'}
            </button>
          </div>
        </div>

        <div className="px-10 py-10 space-y-8">

          {scrapeError && (
            <div className="px-4 py-3 border border-amber-300 bg-amber-50 text-amber-800 text-xs leading-relaxed flex items-start justify-between gap-3">
              <span>⚠ {scrapeError}</span>
              <button onClick={() => setScrapeError('')} className="text-amber-700 hover:text-amber-900 shrink-0">✕</button>
            </div>
          )}

          {business && !isDemoSession && <AccessBanner business={business} />}

          {loadError && (
            <div className="px-4 py-3 border border-amber-300 bg-amber-50 text-amber-800 text-xs leading-relaxed">
              ⚠ Could not load saved reviews: {loadError}{/reach the database/.test(loadError) ? '' : <> If this is a new setup, run <b>supabase_reviews_and_demo.sql</b> in the Supabase SQL Editor.</>}
            </div>
          )}

          {business && !isDemoSession && <NfcCard business={business} />}

          {bizLoading && (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" label="Loading your business…" />
            </div>
          )}

          {!business && !bizLoading && (
            <div className="border border-dashed border-neutral-200 py-24 text-center space-y-6">
              <div className="flex justify-center">
                <div className="h-12 w-12 border border-neutral-200 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-neutral-300" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold text-black">Connect your first business</p>
                <p className="text-xs font-light text-neutral-400 max-w-xs mx-auto leading-relaxed">
                  Add your Google Business Profile and choose which platforms to monitor. We'll generate your first daily AI report overnight.
                </p>
              </div>
              <button onClick={() => setShowWizard(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white text-[11px] uppercase tracking-widest font-bold hover:bg-neutral-800 active:scale-[0.98] transition-all">
                <Plus className="h-3.5 w-3.5" /> Connect Business
              </button>
              <p className="text-[10px] text-neutral-400">Your data is private to your account.</p>
            </div>
          )}

          {business && !bizLoading && dashTab === 'settings' && (
            <SettingsPanel business={business} user={user} />
          )}

          {business && !bizLoading && dashTab !== 'settings' && reviewsLoading && (
            justOnboarded
              ? <FetchingReviewsState businessName={business.name} />
              : <DashboardSkeleton />
          )}

          {business && !bizLoading && dashTab !== 'settings' && !reviewsLoading && (
            <>
              {reviews.length === 0 && !loadError && (
                <div className="border border-dashed border-neutral-200 py-10 text-center space-y-2">
                  <p className="text-sm font-bold text-black">No reviews saved yet for {business.name}</p>
                  <p className="text-xs text-neutral-400">Click “Refresh reviews” (top right) to pull this business's Google reviews.</p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                  label="Total Reviews"
                  value={String(reviews.length)}
                  sub={`${goodCount} positive · ${badCount} need response`}
                  icon={MessageSquare}
                />
                <StatCard
                  label="Avg Rating"
                  value={String(avgRating)}
                  sub={`Across ${reviews.length} Google ratings`}
                  icon={Star}
                />
                <StatCard
                  label="Sentiment Score"
                  value={`${sentScore}%`}
                  sub={sentScore >= 70 ? '% of reviews 4★ or 5★ · healthy' : '% of reviews 4★ or 5★ · needs attention'}
                  icon={sentScore >= 70 ? TrendingUp : TrendingDown}
                  accent={sentScore >= 70 ? 'teal' : 'red'}
                />
                <StatCard
                  label="Platforms Active"
                  value={String(activePlatforms.length)}
                  sub={activePlatforms.map((p: string) => PLATFORMS.find(pl => pl.id === p)?.label.split(' ')[0]).join(' · ') || 'None'}
                  icon={Globe}
                  accent="teal"
                />
              </div>

              {/* Urgent alerts — only on overview tab to avoid repeating it on every sub-tab */}
              {dashTab === 'overview' && report?.urgent_alerts?.length > 0 && (
                <div className="border border-red-200 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <p className="text-[11px] font-bold text-red-700 uppercase tracking-widest">
                      {report.urgent_alerts.length} urgent alert{report.urgent_alerts.length > 1 ? 's' : ''} — respond today
                    </p>
                  </div>
                  {report.urgent_alerts.map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 pl-5.5">
                      <div className="flex-1 space-y-0.5">
                        <p className="text-xs font-semibold text-neutral-800">{a.author}</p>
                        <p className="text-xs text-neutral-500 font-light leading-relaxed">{a.issue}</p>
                      </div>
                      <button
                        onClick={() => setDashTab('daily')}
                        className="shrink-0 text-[11px] font-semibold text-red-700 border border-red-200 px-3 py-1.5 hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        Respond <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {dashTab === 'overview' && (
                <>
                  {/* Sentiment breakdown chart */}
                  <div className="border border-neutral-100 p-6">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-4">Sentiment breakdown</p>
                    <SentimentDonut good={goodCount} medium={mediumCount} bad={badCount} />
                  </div>

                  {/* Sub-tabs: Platform Breakdown / Reviews / AI Report */}
                  <div className="border-b border-neutral-100 flex gap-0">
                    {(['overview', 'reviews', 'report'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveSubTab(tab)}
                        className={`px-5 py-3 text-[11px] uppercase tracking-widest font-semibold border-b-2 transition-colors duration-150 ${activeSubTab === tab ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                      >
                        {tab === 'overview' ? 'Platform Breakdown' : tab === 'reviews' ? `Reviews (${reviews.length})` : 'AI Report'}
                      </button>
                    ))}
                  </div>

                  {activeSubTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {report?.platform_breakdown?.map((pb: any, i: number) => (
                        <div key={i} className="border border-neutral-100 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{PLATFORM_ICONS[pb.platform.toLowerCase().split(' ')[0].replace('/', '')] || '💬'}</span>
                              <p className="text-xs font-semibold text-black">{pb.platform}</p>
                            </div>
                            <span className={`text-sm font-bold ${pb.sentiment >= 70 ? 'text-teal-dark' : 'text-red-500'}`}>{pb.sentiment}%</span>
                          </div>
                          <div className="h-1.5 bg-neutral-100 overflow-hidden">
                            <div
                              className={`h-full ${pb.sentiment >= 70 ? 'bg-teal' : 'bg-red-400'}`}
                              style={{ width: `${pb.sentiment}%`, transition: 'width 0.6s ease' }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span>{pb.mentions} mentions tracked</span>
                            <span className={`font-semibold ${pb.sentiment >= 70 ? 'text-teal-dark' : 'text-red-500'}`}>
                              {pb.sentiment >= 80 ? 'Great' : pb.sentiment >= 60 ? 'Stable' : 'Needs work'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSubTab === 'reviews' && (
                    <ReviewsPanel
                      filteredReviews={filteredReviews}
                      activePlatforms={activePlatforms}
                      filterPlatform={filterPlatform} setFilterPlatform={setFilterPlatform}
                      filterRating={filterRating} setFilterRating={setFilterRating}
                      flaggedCount={flaggedCount}
                    />
                  )}

                  {activeSubTab === 'report' && <ReportPanel report={report} />}
                </>
              )}

              {dashTab === 'daily' && <ReportPanel report={report} title="Today's report" />}
              {dashTab === 'weekly' && <WeeklyReport business={business} reviews={reviews} />}
            </>
          )}
        </div>
      </main>

      {showWizard && user && (
        <OnboardingWizard userId={user.id} onComplete={handleOnboardingComplete} onClose={() => setShowWizard(false)} />
      )}
    </div>
  )
}

function ReviewsPanel({ filteredReviews, activePlatforms, filterPlatform, setFilterPlatform, filterRating, setFilterRating, flaggedCount }: {
  filteredReviews: any[]; activePlatforms: string[]
  filterPlatform: string; setFilterPlatform: (v: string) => void
  filterRating: number; setFilterRating: (v: number) => void
  flaggedCount: number
}) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [limit,  setLimit]  = useState<number>(20)
  const d = (r: any) => (/^\d{4}-/.test(r.date) ? r.date : '')
  const sorted = [...filteredReviews].sort((a, b) =>
    sortBy === 'newest'  ? d(b).localeCompare(d(a)) :
    sortBy === 'oldest'  ? d(a).localeCompare(d(b)) :
    sortBy === 'highest' ? (b.rating - a.rating) || d(b).localeCompare(d(a)) :
                           (a.rating - b.rating) || d(b).localeCompare(d(a)))
  const shown = limit === 0 ? sorted : sorted.slice(0, limit)
  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <select
            value={filterPlatform}
            onChange={e => setFilterPlatform(e.target.value)}
            className="appearance-none border border-neutral-200 px-3 pr-7 py-2 text-[11px] uppercase tracking-widest text-neutral-600 bg-white hover:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value="all">All Platforms</option>
            {activePlatforms.map((pid: string) => (
              <option key={pid} value={pid}>{PLATFORMS.find(p => p.id === pid)?.label || pid}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterRating}
            onChange={e => setFilterRating(Number(e.target.value))}
            className="appearance-none border border-neutral-200 px-3 pr-7 py-2 text-[11px] uppercase tracking-widest text-neutral-600 bg-white hover:border-neutral-400 focus:outline-none cursor-pointer"
          >
            <option value={0}>All Ratings</option>
            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
        </div>
        {(filterPlatform !== 'all' || filterRating > 0) && (
          <button onClick={() => { setFilterPlatform('all'); setFilterRating(0) }} className="text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors px-2">
            Clear filters
          </button>
        )}
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="appearance-none border border-neutral-200 px-3 pr-7 py-2 text-[11px] uppercase tracking-widest text-neutral-600 bg-white hover:border-neutral-400 focus:outline-none cursor-pointer">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest stars</option>
            <option value="lowest">Lowest stars</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            className="appearance-none border border-neutral-200 px-3 pr-7 py-2 text-[11px] uppercase tracking-widest text-neutral-600 bg-white hover:border-neutral-400 focus:outline-none cursor-pointer">
            <option value={20}>Show 20</option>
            <option value={50}>Show 50</option>
            <option value={100}>Show 100</option>
            <option value={0}>Show all</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
        </div>
        <span className="text-[11px] text-neutral-400">Showing {shown.length} of {filteredReviews.length} reviews</span>
        {flaggedCount > 0 && (
          <span className="text-[11px] text-amber-700 flex items-center gap-1 ml-auto">
            <ShieldAlert className="h-3 w-3" /> {flaggedCount} flagged as possibly fake
          </span>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {shown.map((r: any) => <ReviewCard key={r.id} review={r} />)}
        {filteredReviews.length === 0 && (
          <div className="col-span-2 py-16 text-center text-neutral-400 text-sm">No reviews match your filters.</div>
        )}
      </div>
    </div>
  )
}

function ReportPanel({ report, title }: { report: any; title?: string }) {
  if (!report) return null
  return (
    <div className="space-y-8">
      {title && <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">{title} · {report.date}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-bold text-teal-dark uppercase tracking-widest flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" /> Top Praise
          </p>
          {report?.top_praise?.map((p: string, i: number) => (
            <div key={i} className="flex gap-2.5 text-xs text-neutral-600 font-light leading-relaxed">
              <span className="text-teal mt-0.5 shrink-0">+</span>{p}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5">
            <ThumbsDown className="h-3.5 w-3.5" /> Top Complaints
          </p>
          {report?.top_complaints?.map((c: string, i: number) => (
            <div key={i} className="flex gap-2.5 text-xs text-neutral-600 font-light leading-relaxed">
              <span className="text-red-400 mt-0.5 shrink-0">-</span>{c}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">Action Items</p>
        {report?.action_items?.map((a: string, i: number) => (
          <div key={i} className="flex items-start gap-3 border border-neutral-100 px-4 py-3">
            <span className="text-[11px] font-bold text-neutral-300 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <p className="text-xs text-neutral-600 font-light leading-relaxed">{a}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">Reply Drafts</p>
        {report?.suggested_replies?.map((rep: any, i: number) => (
          <div key={i} className="border border-neutral-100 p-4 space-y-3">
            <p className="text-[11px] font-bold text-black uppercase tracking-widest">Reply to {rep.author}</p>
            <p className="text-xs text-neutral-600 font-light leading-relaxed italic">"{rep.draft}"</p>
            <button
              onClick={() => navigator.clipboard?.writeText(rep.draft)}
              className="text-[11px] font-semibold text-black border border-neutral-200 px-3 py-1.5 hover:bg-black hover:text-white transition-all"
            >
              Copy reply
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeeklyReport({ business, reviews }: { business: SavedBusiness; reviews: any[] }) {
  const weeks = weeklyBuckets(reviews, 12)
  const maxCount = Math.max(1, ...weeks.map(w => w.count))
  const cur = weeks[weeks.length - 1], prev = weeks[weeks.length - 2]
  const total12 = weeks.reduce((s, w) => s + w.count, 0)
  const delta = cur.count - prev.count
  return (
    <div className="space-y-6">
      <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">Weekly report · {business.name}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This week" value={String(cur.count)} sub={`${delta >= 0 ? '+' : ''}${delta} vs last week`} icon={MessageSquare} />
        <StatCard label="Avg rating (week)" value={cur.count ? String(cur.avg) : '—'} sub={prev.count ? `last week ${prev.avg}` : 'no reviews last week'} icon={Star} />
        <StatCard label="Positive (week)" value={cur.count ? `${cur.positivePct}%` : '—'} sub={prev.count ? `last week ${prev.positivePct}%` : 'no reviews last week'} icon={TrendingUp} accent="teal" />
        <StatCard label="Last 12 weeks" value={String(total12)} sub="reviews received" icon={BarChart2} />
      </div>
      <div className="border border-neutral-100 p-6 space-y-4">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">Reviews per week (last 12 weeks)</p>
        <div className="flex items-end gap-2 h-40">
          {weeks.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${w.label}: ${w.count} reviews${w.count ? `, avg ${w.avg}★, ${w.positivePct}% positive` : ''}`}>
              <span className="text-[10px] text-neutral-400">{w.count || ''}</span>
              <div className={`w-full ${w.count && w.positivePct < 60 ? 'bg-red-400' : 'bg-teal'}`} style={{ height: `${(w.count / maxCount) * 100}%`, minHeight: w.count ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex gap-2">{weeks.map((w, i) => <span key={i} className="flex-1 text-center text-[9px] text-neutral-400">{w.label}</span>)}</div>
        <p className="text-[10px] text-neutral-400">Red bars = a week where fewer than 60% of reviews were 4★ or 5★. Hover a bar for details.</p>
      </div>
      <div className="border border-neutral-100 p-6 space-y-3">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">Average rating by week</p>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {weeks.map((w, i) => (
            <div key={i} className="text-center border border-neutral-100 py-2">
              <p className="text-[9px] text-neutral-400">{w.label}</p>
              <p className={`text-sm font-bold ${!w.count ? 'text-neutral-300' : w.avg >= 4 ? 'text-teal-dark' : w.avg >= 3 ? 'text-amber-600' : 'text-red-500'}`}>{w.count ? w.avg : '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ business, user }: { business: SavedBusiness; user: User | null }) {
  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">Account</p>
        <div className="border border-neutral-100 p-5 space-y-1">
          <p className="text-xs text-neutral-400">Signed in as</p>
          <p className="text-sm font-semibold text-black">{user?.email}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">Active location</p>
        <div className="border border-neutral-100 p-5 space-y-1">
          <p className="text-sm font-semibold text-black">{business.name}</p>
          <p className="text-xs text-neutral-400">{business.address}</p>
          <p className="text-xs text-neutral-400 pt-2">Monitoring: {business.platforms.map(p => PLATFORMS.find(pl => pl.id === p)?.label || p).join(', ')}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400 mb-3">Data and privacy</p>
        <div className="border border-neutral-100 p-5 space-y-2">
          <p className="text-xs text-neutral-500 font-light leading-relaxed">
            Your account data is protected by Row Level Security — only you can read or write
            your own business records. See our{' '}
            <Link to="/privacy" className="text-black underline">Privacy Policy</Link> for details.
          </p>
        </div>
      </div>
    </div>
  )
}


// Warns the owner before the NFC card is blocked, and tells them when it already is.
function AccessBanner({ business }: { business: SavedBusiness }) {
  if (!business.access_ends_at) return null
  const daysLeft = Math.ceil((new Date(business.access_ends_at).getTime() - Date.now()) / 86400000)
  if (daysLeft > 7) return null
  const expired = daysLeft <= 0
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border text-sm ${expired ? 'border-red-300 bg-red-50 text-red-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
      <span>
        {expired
          ? <>Your plan has ended, so your NFC card is <b>blocked</b>: customers who tap it see an inactive page.</>
          : <>Your plan ends in <b>{daysLeft} day{daysLeft === 1 ? '' : 's'}</b>. After that your NFC card stops working.</>}
      </span>
      <Link to="/renew" className="bg-black text-white px-4 py-2 text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800">Renew now</Link>
    </div>
  )
}
