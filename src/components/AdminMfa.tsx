import { useState, type FormEvent } from 'react'
import { mfaEnroll, mfaVerify } from '../utils/supabaseClient'

// Second login step for /admin: a 6-digit code from an authenticator app (Google Authenticator, Authy, etc).
// First time: scan the QR code to set it up. After that: just type the code.
export default function AdminMfa({ factorId, onDone }: { factorId: string | null; onDone: () => void }) {
  const [id,     setId]     = useState<string | null>(factorId)
  const [qr,     setQr]     = useState('')
  const [secret, setSecret] = useState('')
  const [code,   setCode]   = useState('')
  const [err,    setErr]    = useState('')
  const [busy,   setBusy]   = useState(false)

  const start = async () => {
    setErr(''); setBusy(true)
    const r = await mfaEnroll()
    setBusy(false)
    if (r.error || !r.factorId) return setErr(r.error || 'Could not start setup. Try again.')
    setId(r.factorId); setQr(r.qr || ''); setSecret(r.secret || '')
  }

  const verify = async (e: FormEvent) => {
    e.preventDefault()
    if (!id) return
    setErr(''); setBusy(true)
    const msg = await mfaVerify(id, code.trim())
    setBusy(false)
    if (msg) return setErr('That code did not work. Check the 6 digits and try again.')
    onDone()
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-xl font-bold text-black tracking-tight">Admin sign-in: step 2</h1>

        {!id && (
          <>
            <p className="text-sm text-neutral-500">Admin needs a code from an authenticator app. Set it up once; it takes a minute.</p>
            <button onClick={start} disabled={busy} className="w-full bg-black text-white px-5 py-3 text-[11px] uppercase tracking-widest font-semibold disabled:opacity-40">
              {busy ? 'Starting…' : 'Set up authenticator'}
            </button>
          </>
        )}

        {id && (
          <form onSubmit={verify} className="space-y-4">
            {qr ? (
              <>
                <p className="text-sm text-neutral-500">Scan this with your authenticator app, then type the 6-digit code it shows.</p>
                <img src={qr} alt="Authenticator QR code" width={180} height={180} className="border border-neutral-200" />
                {secret && <p className="text-xs text-neutral-400 break-all">Can't scan? Enter this key by hand: <span className="font-mono text-black">{secret}</span></p>}
              </>
            ) : (
              <p className="text-sm text-neutral-500">Type the 6-digit code from your authenticator app.</p>
            )}
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
              className="w-full border border-neutral-200 px-3 py-2.5 text-lg tracking-[0.4em] text-center font-mono focus:outline-none focus:border-black" />
            <button disabled={busy || code.length !== 6} className="w-full bg-black text-white px-5 py-3 text-[11px] uppercase tracking-widest font-semibold disabled:opacity-40">
              {busy ? 'Checking…' : 'Verify'}
            </button>
          </form>
        )}
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    </div>
  )
}
