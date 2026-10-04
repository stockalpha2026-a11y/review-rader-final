import { useState } from 'react'
import { X, Globe, AlertTriangle, Building2 } from 'lucide-react'
import { Spinner } from './Loaders'
import { saveBusiness, scrapeGoogleReviews } from '../utils/supabaseClient'
import { parseGoogleTarget } from '../utils/googleTarget'

// Help text shown under every field where someone pastes a Google Maps
// link. Kept in one place so the wording (and the laptop/phone split)
// stays identical everywhere it appears.
const MAPS_LINK_HELP =
  'On a laptop, search your business on Google Maps and copy the link from the address bar. ' +
  'On a phone, open maps.google.com in the browser, not the app. ' +
  'Short links from the Share button (share.google, maps.app.goo.gl) won\u2019t work \u2014 ' +
  'only the full address-bar link, or a Place ID starting with ChIJ.'

interface Props {
  userId: string
  onComplete: (biz: any) => void
  onClose: () => void
}

type Step = 'search' | 'connecting'

export default function OnboardingWizard({ userId, onComplete, onClose }: Props) {
  const [step,        setStep]        = useState<Step>('search')
  const [customName,  setCustomName]  = useState('')
  const [customLink,  setCustomLink]  = useState('')
  const [customErr,   setCustomErr]   = useState('')
  const [connecting,   setConnecting]   = useState(false)
  const [connectError, setConnectError] = useState('')
  const [pendingBiz,   setPendingBiz]   = useState<any>(null)

  // ── Save, then pull the first batch of reviews ──────────────────
  // Runs on first submit and again on every Retry, so it's written to
  // be safely re-callable: saveBusiness upserts by place_id, so saving
  // twice is harmless.
  const runConnect = async (bizData: any) => {
    setConnecting(true)
    setConnectError('')
    setStep('connecting')

    try {
      await saveBusiness(userId, bizData)
    } catch (err: any) {
      // Previously this failed silently here — the button would spin
      // forever with no feedback, the business never actually got
      // saved, and it looked "connected" to the user until their next
      // sign-in showed the empty state again with no explanation.
      setConnecting(false)
      setConnectError(
        err?.message?.includes('row-level security')
          ? 'Could not save — your Supabase database rules are blocking this. Re-run supabase_setup.sql and confirm Row Level Security policies exist on the businesses table.'
          : `Could not save your business: ${err?.message || 'unknown error'}. Please try again.`
      )
      return
    }

    const { reviews, error } = await scrapeGoogleReviews(bizData.maps_url, 30, bizData.place_id)
    setConnecting(false)

    if (error) {
      setConnectError(`Could not fetch your reviews: ${error}`)
      return
    }
    if (!reviews.length) {
      setConnectError(
        'Your business is saved, but we could not find any reviews yet. This can happen right after a listing is created, ' +
        'or if the Maps link doesn\u2019t exactly match this business. Double-check the link and try again.'
      )
      return
    }
    onComplete(bizData)
  }

  // Google only: the business name + its Google Maps link (or a Place ID starting with ChIJ).
  const submitLink = () => {
    setCustomErr('')
    if (customName.trim().length < 2) return setCustomErr('Enter the business name.')
    const t = parseGoogleTarget(customLink)
    if ('error' in t) return setCustomErr(t.error)
    const bizData = {
      place_id: t.placeId, name: customName.trim(), address: 'Added by Google Maps link', rating: 0,
      platforms: ['google'], maps_url: t.mapsUrl || undefined,
    }
    setPendingBiz(bizData)
    runConnect(bizData)
  }

  const handleRetry = () => { if (pendingBiz) runConnect(pendingBiz) }

  // While we're actively saving/fetching, block closing so the person
  // can't dismiss the wizard mid-request and lose track of whether it
  // actually finished. Once it lands on the retry/error screen they're
  // free to back out again.
  const blockClose = step === 'connecting' && connecting

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        style={{ animation: 'fadeIn 0.2s ease' }}
        onClick={blockClose ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
          style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-neutral-100 px-5 sm:px-7 py-5 flex items-center justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-base font-bold text-black tracking-tight">
                {step === 'connecting' ? (connecting ? 'Connecting\u2026' : 'Couldn\u2019t finish connecting') : 'Connect your business'}
              </h2>
              <p className="text-xs text-neutral-400 font-light mt-0.5">
                {step === 'search'     && 'Add your business with its Google Maps link'}
                {step === 'connecting' && (connecting ? 'Saving your business and pulling your first reviews' : 'Your business is saved — we just need the reviews')}
              </p>
            </div>
            {!blockClose && (
              <button onClick={onClose} className="text-neutral-300 hover:text-black transition-colors p-2 -m-2">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {step === 'search' && (
            <div className="px-5 sm:px-7 py-6 space-y-4" style={{ animation: 'fadeSlide 0.25s ease' }}>
              <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Business name" maxLength={120}
                className="w-full border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-black" />
              <input value={customLink} onChange={e => setCustomLink(e.target.value)} placeholder="https://www.google.com/maps/place/...  (or a Place ID starting with ChIJ)"
                className="w-full border border-neutral-200 px-4 py-3 text-sm focus:outline-none focus:border-black" />
              <p className="text-[11px] text-neutral-400 leading-relaxed">{MAPS_LINK_HELP}</p>
              {customErr && <p className="text-xs text-red-500">{customErr}</p>}
              <button onClick={submitLink}
                className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Globe className="h-3.5 w-3.5" /><span>Start monitoring Google reviews</span>
              </button>
            </div>
          )}

          {/* Step: Connecting — saves the business, pulls the first batch of
              reviews, then hands straight off to the dashboard. No separate
              "done" screen: success here means the wizard is finished. */}
          {step === 'connecting' && (
            <div className="px-5 sm:px-7 py-10 space-y-6 text-center" style={{ animation: 'fadeSlide 0.3s ease' }}>
              {connecting ? (
                <>
                  <div className="flex justify-center">
                    <Spinner size="lg" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-black">{pendingBiz?.name}</p>
                    <p className="text-xs text-neutral-400 font-light max-w-xs mx-auto leading-relaxed">
                      Pulling your Google reviews for the first time. This can take up to a minute — don't close this window.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-black">Couldn't finish connecting</p>
                    <p className="text-xs text-neutral-500 font-light max-w-xs mx-auto leading-relaxed">{connectError}</p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={handleRetry}
                      className="w-full py-3.5 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 active:scale-[0.98] transition-all"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => setStep('search')}
                      className="w-full py-2.5 text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                    >
                      ← Back and edit details
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn    { from{opacity:0}                                             to{opacity:1} }
        @keyframes slideUp   { from{opacity:0;transform:translateY(24px) scale(0.97)}     to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateX(10px)}                 to{opacity:1;transform:translateX(0)} }
        @keyframes popIn     { from{opacity:0;transform:scale(0.5)}                       to{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  )
}
