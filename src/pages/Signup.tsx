import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { localSignUp, SUPABASE_CONFIG_ERROR } from '../utils/supabaseClient'
import { CheckCircle, User, Mail, Lock, Globe, ChevronDown } from 'lucide-react'
import { Spinner } from '../components/Loaders'

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'UAE', 'Germany', 'France', 'Other',
]

const BIZ_TYPES = [
  'Restaurant / Cafe', 'Retail Store', 'Clinic / Hospital',
  'Salon / Spa', 'Hotel / Hospitality', 'Real Estate',
  'Digital Agency', 'E-commerce', 'Other',
]

type Step = 1 | 2

export default function Signup() {
  const [step,     setStep]     = useState<Step>(1)
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [country,  setCountry]  = useState('')
  const [bizType,  setBizType]  = useState('')
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  const handleStep1 = (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!fullName.trim())    return setErr('Please enter your full name.')
    if (!email.trim())       return setErr('Please enter your email.')
    if (password.length < 8) return setErr('Password must be at least 8 characters.')
    if (password !== confirm) return setErr('Passwords do not match.')
    setStep(2)
  }

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    if (!country)  return setErr('Please select your country.')
    if (!bizType)  return setErr('Please select your business type.')
    setLoading(true)

    try {
      const { session, error } = await localSignUp(email, password, {
        full_name: fullName, country, business_type: bizType,
      })

      if (error) {
        setErr(error.message)
        setLoading(false)
        return
      }
      if (session) {
        // Picked up by App.tsx's onAuthStateChange listener (real
        // Supabase sign-up) before this navigate fires.
        navigate('/dashboard', { replace: true })
      }
    } catch (ex) {
      setErr('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {([1, 2] as const).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                  step > n  ? 'bg-black text-white' :
                  step === n ? 'bg-black text-white scale-110' :
                  'bg-neutral-100 text-neutral-400'
                }`}>
                  {step > n ? <CheckCircle className="h-3 w-3" /> : n}
                </div>
                <span className={`text-[11px] uppercase tracking-widest font-medium transition-colors ${step === n ? 'text-black' : 'text-neutral-400'}`}>
                  {n === 1 ? 'Account' : 'Profile'}
                </span>
                {n < 2 && <div className={`w-8 h-px mx-1 transition-all ${step > n ? 'bg-black' : 'bg-neutral-200'}`} />}
              </div>
            ))}
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeUp 0.35s ease' }}>
              <div className="space-y-1.5 mb-7">
                <h1 className="text-2xl font-bold text-black tracking-tight">Create account</h1>
                <p className="text-sm font-light text-neutral-500">14-day free trial. No credit card required.</p>
              </div>
              {SUPABASE_CONFIG_ERROR && (
                <div className="px-4 py-3 mb-4 border border-amber-300 bg-amber-50 text-amber-800 text-xs leading-relaxed">
                  ⚠ {SUPABASE_CONFIG_ERROR}
                </div>
              )}
              <form onSubmit={handleStep1} className="space-y-4">
                <Field label="Full name"        id="name"  type="text"     value={fullName} onChange={setFullName} placeholder="Your full name"       icon={<User className="h-3.5 w-3.5" />} />
                <Field label="Email"            id="email" type="email"    value={email}    onChange={setEmail}    placeholder="you@company.com"   icon={<Mail className="h-3.5 w-3.5" />} />
                <Field label="Password"         id="pw"    type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" icon={<Lock className="h-3.5 w-3.5" />} />
                <Field label="Confirm password" id="cpw"   type="password" value={confirm}  onChange={setConfirm}  placeholder="••••••••"          icon={<Lock className="h-3.5 w-3.5" />} />
                {err && <ErrorBox msg={err} />}
                <button type="submit" className="w-full py-3.5 bg-black text-white font-bold text-[11px] uppercase tracking-widest hover:bg-neutral-800 active:scale-[0.98] transition-all">
                  Continue →
                </button>
              </form>
              <p className="text-xs text-neutral-500 text-center mt-6">
                Already have an account? <Link to="/login" className="text-black font-semibold hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeUp 0.35s ease' }}>
              <div className="space-y-1.5 mb-7">
                <h1 className="text-2xl font-bold text-black tracking-tight">Tell us about yourself</h1>
                <p className="text-sm font-light text-neutral-500">We'll personalise your experience.</p>
              </div>
              <form onSubmit={handleStep2} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Country
                  </label>
                  <div className="relative">
                    <select value={country} onChange={(e) => setCountry(e.target.value)} required className="w-full px-4 py-3 border border-neutral-200 bg-white text-sm text-black appearance-none focus:outline-none focus:border-black transition-colors">
                      <option value="">Select your country</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium flex items-center gap-1.5">
                    <BizIcon className="h-3 w-3" /> Business type
                  </label>
                  <div className="relative">
                    <select value={bizType} onChange={(e) => setBizType(e.target.value)} required className="w-full px-4 py-3 border border-neutral-200 bg-white text-sm text-black appearance-none focus:outline-none focus:border-black transition-colors">
                      <option value="">Select business type</option>
                      {BIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
                {err && <ErrorBox msg={err} />}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setStep(1); setErr('') }} className="px-5 py-3.5 border border-neutral-200 text-neutral-500 text-[11px] uppercase tracking-widest hover:border-neutral-400 hover:text-black transition-colors">←</button>
                  <button type="submit" disabled={loading} className="flex-1 py-3.5 bg-black text-white font-bold text-[11px] uppercase tracking-widest hover:bg-neutral-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><Spinner size="sm" /><span>Creating account…</span></> : 'Create account →'}
                  </button>
                </div>
              </form>
              <p className="text-[11px] text-neutral-400 text-center mt-5 leading-relaxed">
                By signing up you agree to our <a href="/terms" className="underline hover:text-black">Terms</a> and <a href="/privacy" className="underline hover:text-black">Privacy Policy</a>.
              </p>
            </div>
          )}
        </div>
      </main>
      <Styles />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-neutral-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link to="/" className="font-bold text-black text-sm tracking-tight flex items-center gap-1.5">
          ReviewRadar <span className="h-1.5 w-1.5 rounded-full bg-teal" />
        </Link>
      </div>
    </header>
  )
}

function Field({ label, id, type, value, onChange, placeholder, icon }: {
  label: string; id: string; type: string; value: string
  onChange: (v: string) => void; placeholder: string; icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[11px] uppercase tracking-widest text-neutral-500 font-medium flex items-center gap-1.5">
        {icon}{label}
      </label>
      <input id={id} type={type} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 border border-neutral-200 bg-white text-black text-sm placeholder:text-neutral-300 focus:outline-none focus:border-black transition-colors" />
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return <div className="px-4 py-3 border border-red-200 bg-red-50 text-red-600 text-xs leading-relaxed">{msg}</div>
}

function Styles() {
  return <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
}

function BizIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/>
      <path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  )
}
