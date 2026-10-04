import { useSearchParams } from 'react-router-dom'

// Shown when someone taps an NFC card whose subscription has ended.
export default function Expired() {
  const [params] = useSearchParams()
  const name = (params.get('n') || '').slice(0, 80)
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-black">This review link is currently inactive</h1>
        <p className="mt-3 text-sm text-neutral-500">
          {name ? `${name}'s` : 'This'} ReviewRadar card is paused. Please ask the business owner to renew it.
        </p>
        <p className="mt-4 text-xs text-neutral-400">Business owner? <a href="/login" className="underline text-black">Sign in to renew</a>.</p>
        <p className="mt-6 text-[11px] uppercase tracking-widest text-neutral-400">ReviewRadar</p>
      </div>
    </div>
  )
}
