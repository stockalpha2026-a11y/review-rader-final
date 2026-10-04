import { useEffect, useState } from 'react'
import { loadTapCounts, tapLink, type SavedBusiness } from '../utils/supabaseClient'

// Shows the business's NFC link, access window and tap counts.
// Read-only on purpose: access dates can only be changed by the operator (SQL),
// and a database trigger blocks customers from editing them.
export default function NfcCard({ business }: { business: SavedBusiness }) {
  const [counts, setCounts] = useState<{ total: number; blocked: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const link = tapLink(business.slug)

  useEffect(() => { loadTapCounts(business.slug).then(setCounts) }, [business.slug])

  if (!business.slug) return null

  const end = business.access_ends_at ? new Date(business.access_ends_at) : null
  const daysLeft = end ? Math.ceil((end.getTime() - Date.now()) / 86400000) : null
  const active = daysLeft !== null && daysLeft > 0

  return (
    <div className="border border-neutral-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-neutral-500">NFC review card</p>
        <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-1 ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {active ? `Active · ${daysLeft}d left` : 'Expired'}
        </span>
      </div>
      {end && <p className="text-xs text-neutral-500">{active ? 'Renews / ends' : 'Ended'} {end.toLocaleDateString()}</p>}
      {link && (
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="flex-1 text-[11px] border border-neutral-200 px-2 py-1.5 text-neutral-600" />
          <button
            onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="text-[10px] uppercase tracking-widest font-semibold border border-neutral-200 hover:border-black px-2.5 py-1.5"
          >{copied ? 'Copied' : 'Copy'}</button>
        </div>
      )}
      {counts && <p className="text-xs text-neutral-500">{counts.total} taps total{counts.blocked > 0 ? ` · ${counts.blocked} blocked` : ''}</p>}
    </div>
  )
}
