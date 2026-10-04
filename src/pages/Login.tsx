import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { localSignIn, SUPABASE_CONFIG_ERROR } from '../utils/supabaseClient'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Spinner } from '../components/Loaders'

// Mock demo credentials
const DEMO = { email: 'demo@reviewradar.com', password: 'demo1234' }

// Client-side brute-force throttle. Real protection against automated
// attacks (DDoS, scripted credential stuffing) has to live at the
// infrastructure layer — Supabase Auth already rate-limits sign-in
// attempts server-side regardless of this. This is just a UX-friendly
// second layer that stops someone from hammering the button by hand.
const MAX_ATTEMPTS = 5
const LOCKOUT_MS    = 30_000

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockRemaining, setLockRemaining] = useState(0)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // /login?demo=1 (the “Live demo” button) signs straight into the demo account.
  useEffect(() => {
    if (params.get('demo') !== '1') return
    localSignIn(DEMO.email, DEMO.password).then(({ session }) => { if (session) navigate('/dashboard', { replace: true }) })
  }, [params, navigate])

  useEffect(() => {
    if (!lockedUntil) return
    const iv = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
      setLockRemaining(remaining)
      if (remaining <= 0) { setLockedUntil(null); setAttempts(0) }
    }, 250)
    return () => clearInterval(iv)
  }, [lockedUntil])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (lockedUntil && Date.now() < lockedUntil) return
    if (!email || !password) return setErr('Please fill in all fields.')
    setLoading(true)
    try {
      const { session, error } = await localSignIn(email, password)
      if (error) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS)
          setErr(`Too many failed attempts. Please wait 30 seconds before trying again.`)
        } else {
          setErr(error.message)
        }
        setLoading(false)
        return
      }
      if (session) {
        setAttempts(0)
        // Demo logins fire rr_login manually; real Supabase logins are
        // picked up by App.tsx's onAuthStateChange listener. Either way
        // session state updates before this navigate fires.
        navigate('/dashboard', { replace: true })
      }
    } catch (ex) {
      setErr('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setEmail(DEMO.email)
    setPassword(DEMO.password)
    setErr('')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link to="/" className="font-bold text-black text-sm tracking-tight flex items-center gap-1.5">
            ReviewRadar <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse2" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8" style={{ animation: 'fadeUp 0.4s ease both' }}>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-black tracking-tight">Welcome back</h1>
            <p className="text-sm font-light text-neutral-500">Sign in to your ReviewRadar account.</p>
          </div>

          {/* Config warning — only shows if env vars are missing on this deploy */}
          {SUPABASE_CONFIG_ERROR && (
            <div className="px-4 py-3 border border-amber-300 bg-amber-50 text-amber-800 text-xs leading-relaxed">
              ⚠ {SUPABASE_CONFIG_ERROR}
            </div>
          )}

          {/* Demo credentials banner */}
          <div className="border border-teal/30 bg-teal/5 p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-teal font-bold">Try the demo</p>
            <p className="text-xs text-neutral-500 font-light">Use these credentials to explore a fully populated dashboard:</p>
            <div className="font-mono text-xs text-neutral-700 space-y-0.5">
              <p><span className="text-neutral-400">email:</span> {DEMO.email}</p>
              <p><span className="text-neutral-400">password:</span> {DEMO.password}</p>
            </div>
            <button
              onClick={fillDemo}
              className="text-[11px] font-semibold text-teal hover:text-black transition-colors uppercase tracking-widest"
            >
              Fill automatically →
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Email
              </label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-neutral-200 bg-white text-black text-sm placeholder:text-neutral-300 focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pw" className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium flex items-center gap-1.5">
                <Lock className="h-3 w-3" /> Password
              </label>
              <div className="relative">
                <input
                  id="pw" type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-10 border border-neutral-200 bg-white text-black text-sm placeholder:text-neutral-300 focus:outline-none focus:border-black transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="px-4 py-3 border border-red-200 bg-red-50 text-red-600 text-xs leading-relaxed">{err}</div>
            )}

            <button
              type="submit" disabled={loading || !!lockedUntil}
              className="w-full py-3.5 bg-black text-white font-bold text-[11px] uppercase tracking-widest hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {lockedUntil
                ? <span>Try again in {lockRemaining}s</span>
                : loading
                ? <><Spinner size="sm" /><span>Signing in…</span></>
                : <><span>Sign in</span><ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>
          </form>

          <p className="text-xs text-neutral-500 text-center">
            Don't have an account?{' '}
            <Link to="/signup" className="text-black font-semibold hover:underline">Sign up free</Link>
          </p>
        </div>
      </main>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .animate-pulse2 { animation: pulse2 2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .bg-teal { background-color: #00d4aa; }
        .text-teal { color: #00d4aa; }
        .border-teal\\/30 { border-color: rgba(0,212,170,0.3); }
        .bg-teal\\/5 { background-color: rgba(0,212,170,0.05); }
      `}</style>
    </div>
  )
}
