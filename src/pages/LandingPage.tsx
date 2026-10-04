import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { ArrowRight, Star, TrendingUp, Shield, Zap, Globe } from 'lucide-react'
// three.js is a large library only needed for the decorative background —
// lazy-load it so the page's actual content (text, pricing, nav) paints
// immediately instead of waiting on a ~600KB 3D library to download first.
const ParticleBackground = lazy(() => import('../components/ParticleBackground'))

const PLANS = [
  { name: 'Starter',  monthly: 599,  annual: 499,  desc: 'Just the card — collect reviews instantly',          support: 'Email support',      cta: 'Start free', hot: false,
    features: ['1 NFC review card', 'Tap-to-review for customers', 'Google review link', 'Basic review tracking'] },
  { name: 'Basic',    monthly: 999,  annual: 799,  desc: 'Card + software — monitor and manage reviews',       support: 'Priority chat',      cta: 'Start free', hot: true,
    features: ['1 NFC review card', 'Full software dashboard access', 'Google & Reddit monitoring', 'Morning email reports', 'Basic sentiment analysis'] },
  { name: 'Max',      monthly: 1299, annual: 999,  desc: '2 cards + software with full AI analysis',           support: 'Priority chat',      cta: 'Start free', hot: false,
    features: ['2 NFC review cards', 'Full software dashboard access', 'Google & Reddit monitoring', 'AI sentiment analysis', 'Crisis alerts', 'Morning email reports'] },
]

const ENTERPRISE = {
  name: 'Enterprise', price: 5999,
  desc: 'For businesses with an existing website — we wire up automation on top of it, plus your NFC card.',
  features: ['Everything in Max', 'Website automation & integration', '1 NFC review card included', 'Dedicated onboarding', 'Custom workflows'],
  support: 'Dedicated account manager', cta: 'Contact us',
}

const FEATURES = [
  { icon: Globe,       title: 'Multi-platform monitoring', desc: 'Google and Reddit, in one dashboard. New platforms added regularly.' },
  { icon: Zap,         title: 'AI-powered daily reports',  desc: 'Every morning at 8am, get a clean summary of what customers said, what to fix, and draft replies.' },
  { icon: TrendingUp,  title: 'Sentiment analytics',       desc: 'Track your reputation score over time. See which topics are trending positively or negatively.' },
  { icon: Shield,      title: 'Instant crisis alerts',     desc: '1–2 star reviews trigger an instant notification so you can respond before the damage spreads.' },
]

const HOW = [
  { step: '01', title: 'Connect your business', desc: 'Search your Google Business Profile and link it in under 60 seconds. No API keys needed.' },
  { step: '02', title: 'Choose your platforms', desc: 'Select which platforms to monitor: Google, Reddit, and more coming soon.' },
  { step: '03', title: 'Get your morning report', desc: 'Every day at 8am, your AI-powered report lands in your inbox with insights and action items.' },
]

const TYPING_PHRASES = [
  'Know what customers say.',
  'Catch bad reviews early.',
  'Reply before it spreads.',
  'Fix what matters most.',
  'Build a better reputation.',
]

function useTypingEffect(phrases: string[], speed = 55, pause = 2200) {
  const [displayed, setDisplayed] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx]     = useState(0)
  const [deleting, setDeleting]   = useState(false)

  useEffect(() => {
    const current = phrases[phraseIdx]
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => setCharIdx(c => c + 1), speed)
    } else if (!deleting && charIdx > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause)
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx(c => c - 1), speed / 2)
    } else {
      setDeleting(false)
      setPhraseIdx(p => (p + 1) % phrases.length)
    }

    setDisplayed(current.slice(0, charIdx))
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause])

  return displayed
}

export default function LandingPage() {
  const [annual, setAnnual] = useState(false)
  const cursorRef  = useRef<HTMLDivElement>(null)
  const typedText  = useTypingEffect(TYPING_PHRASES)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!cursorRef.current) return
      cursorRef.current.style.left = e.clientX + 'px'
      cursorRef.current.style.top  = e.clientY + 'px'
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div className="relative min-h-screen bg-white text-neutral-600 font-sans overflow-x-hidden">
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>
      <div ref={cursorRef} className="cursor-glow" />

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-bold text-black tracking-tight flex items-center gap-1.5 text-sm">
            ReviewRadar
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse2" />
          </span>
          <nav className="hidden md:flex items-center gap-8 text-[11px] tracking-widest uppercase text-neutral-400">
            <a href="#how"      className="hover:text-black transition-colors">How it works</a>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-black transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-5">
            <a href="/login?demo=1" className="text-[11px] uppercase tracking-widest text-teal-dark hover:text-black font-semibold transition-colors">Live demo</a>
            <a href="/login"  className="text-[11px] uppercase tracking-widest text-neutral-400 hover:text-black transition-colors">Sign in</a>
            <a href="/signup" className="px-4 py-2 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-colors">Get started</a>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center px-6 pt-16 z-10">
        <div className="max-w-6xl mx-auto w-full">
          <div className="max-w-3xl space-y-10">
            <div className="animate-fadeUp">
              <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-400 border border-neutral-200 px-3 py-1.5">
                <span className="h-1 w-1 rounded-full bg-teal animate-pulse2" />
                AI-powered review intelligence
              </span>
            </div>

            {/* Typing animation headline */}
            <div className="animate-fadeUp-d1">
              <h1 className="text-5xl md:text-[72px] font-bold text-black leading-[1.05] tracking-tight">
                <span className="text-neutral-300">Every day.</span><br />
                <span className="min-h-[1.1em] block">
                  {typedText}
                  <span className="typing-cursor text-teal" />
                </span>
              </h1>
            </div>

            <p className="animate-fadeUp-d2 text-base md:text-lg font-light text-neutral-500 leading-relaxed max-w-xl">
              ReviewRadar scrapes Google and Reddit, runs AI sentiment analysis, and delivers a crisp morning report so you always know what to fix.
            </p>
            <div className="animate-fadeUp-d3 flex flex-col sm:flex-row gap-3 pt-2">
              <a href="/signup" className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-colors group">
                Start 14-day free trial
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="#how" className="inline-flex items-center justify-center gap-2 px-7 py-4 border border-neutral-200 text-neutral-600 text-[11px] uppercase tracking-widest hover:border-neutral-400 hover:text-black transition-colors">
                See how it works
              </a>
            </div>
            <p className="animate-fadeUp-d3 text-[11px] text-neutral-400">
              No credit card required · Setup in 60 seconds · Cancel anytime
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-fadeUp-d3 flex flex-col items-center gap-2 text-neutral-300">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-neutral-300" />
          <span className="text-[9px] uppercase tracking-widest">scroll</span>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────── */}
      <section id="how" className="relative z-10 py-32 bg-neutral-50 border-y border-neutral-100 px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-teal font-semibold">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight">Three steps. Zero friction.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {HOW.map((h, i) => (
              <div key={h.step} className="space-y-5 group" style={{ animation: `fadeUp 0.5s ${i * 0.12}s ease both` }}>
                <span className="text-[64px] font-black text-neutral-500 group-hover:text-neutral-700 transition-colors leading-none select-none">{h.step}</span>
                <h3 className="text-sm font-bold text-black">{h.title}</h3>
                <p className="text-sm font-light text-neutral-500 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────── */}
      <section id="features" className="relative z-10 py-32 bg-white px-6">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-teal font-semibold">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="border border-neutral-100 p-8 space-y-4 hover:border-neutral-300 transition-all duration-300 hover:shadow-md group"
                style={{ animation: `fadeUp 0.5s ${i * 0.1}s ease both` }}
              >
                <div className="h-9 w-9 border border-neutral-200 flex items-center justify-center group-hover:border-teal/40 group-hover:bg-teal/5 transition-all duration-200">
                  <f.icon className="h-4 w-4 text-neutral-400 group-hover:text-teal transition-colors duration-200" />
                </div>
                <h3 className="text-sm font-bold text-black">{f.title}</h3>
                <p className="text-sm font-light text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────── */}
      <section id="pricing" className="relative z-10 py-32 bg-neutral-50 border-y border-neutral-100 px-6">
        <div className="max-w-6xl mx-auto space-y-14">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-widest text-teal font-semibold">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight">Predictable flat rates.</h2>
            </div>
            <div className="flex items-center gap-1 border border-neutral-200 p-1 rounded-md bg-white">
              {['Monthly', 'Annual'].map((label) => {
                const isAnn = label === 'Annual'
                const active = annual === isAnn
                return (
                  <button
                    key={label}
                    onClick={() => setAnnual(isAnn)}
                    className={`px-3 py-1.5 text-[11px] uppercase tracking-widest transition-all rounded-sm flex items-center gap-1.5 ${active ? 'bg-black text-white font-semibold shadow-sm' : 'text-neutral-400 hover:text-neutral-600'}`}
                  >
                    {label}
                    {isAnn && <span className="text-[9px] bg-teal/20 text-teal font-bold px-1 py-0.5 rounded">-20%</span>}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((p, i) => (
              <div
                key={p.name}
                className={`relative flex flex-col p-8 space-y-6 border transition-all duration-300 ${p.hot ? 'border-black shadow-xl scale-[1.02]' : 'border-neutral-200 hover:border-neutral-400 hover:shadow-md'}`}
                style={{ animation: `fadeUp 0.5s ${i * 0.12}s ease both` }}
              >
                {p.hot && (
                  <span className="absolute -top-3 left-6 text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold">Most popular</span>
                )}
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-black">{p.name}</h3>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed">{p.desc}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-black">₹{(annual ? p.annual : p.monthly).toLocaleString('en-IN')}</span>
                    <span className="text-xs text-neutral-400">/mo</span>
                  </div>
                  {annual && (
                    <p className="text-[11px] text-neutral-400">
                      Billed ₹{(p.annual * 12).toLocaleString('en-IN')} annually
                    </p>
                  )}
                </div>
                <ul className="space-y-2">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-neutral-500">
                      <span className="text-teal text-[10px]">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-neutral-400 font-light">{p.support}</div>
                <a
                  href="/signup"
                  onClick={() => { try { localStorage.setItem('rr_plan_pref', JSON.stringify({ plan: p.name.toLowerCase(), billing: annual ? 'annual' : 'monthly' })) } catch { /* ignore */ } }}
                  className={`mt-auto text-center py-3 text-[11px] uppercase tracking-widest font-semibold transition-all active:scale-[0.98] ${p.hot ? 'bg-black text-white hover:bg-neutral-800' : 'border border-neutral-200 text-black hover:border-black hover:bg-neutral-50'}`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>

          {/* ── ENTERPRISE ───────────────────────────── */}
          <div className="border border-neutral-200 p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white">
            <div className="space-y-2 max-w-xl">
              <span className="text-[10px] uppercase tracking-widest bg-black text-white px-2 py-0.5 font-bold inline-block w-fit">Enterprise</span>
              <h3 className="text-lg font-bold text-black">{ENTERPRISE.name} — ₹{ENTERPRISE.price.toLocaleString('en-IN')}</h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">{ENTERPRISE.desc}</p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-2">
                {ENTERPRISE.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-neutral-500">
                    <span className="text-teal text-[10px]">✓</span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
            <a
              href="/signup"
              className="shrink-0 text-center px-8 py-3 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-colors active:scale-[0.98]"
            >
              {ENTERPRISE.cta}
            </a>
          </div>

          <p className="text-center text-[11px] text-neutral-400">
            Annual plans are billed once a year at the discounted monthly rate × 12. <a href="/signup" className="text-black underline">Upgrade anytime.</a>
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────── */}
      <section className="relative z-10 py-28 border-t border-neutral-100 bg-white px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
          <div className="space-y-4 max-w-lg">
            <h2 className="text-3xl md:text-4xl font-bold text-black tracking-tight leading-tight">
              Ready to stop checking reviews manually?
            </h2>
            <p className="text-sm font-light text-neutral-500">Connect your first location in 60 seconds. Cancel anytime.</p>
          </div>
          <a href="/signup" className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-black text-white text-[11px] uppercase tracking-widest font-semibold hover:bg-neutral-800 transition-colors group">
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer className="relative z-10 border-t border-neutral-100 bg-neutral-50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
          <span className="font-bold text-black text-sm flex items-center gap-1.5">
            ReviewRadar <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          </span>
          <p className="text-[11px] text-neutral-400">© {new Date().getFullYear()} ReviewRadar. All rights reserved.</p>
          <div className="flex gap-6 text-[11px] text-neutral-400 flex-wrap justify-center">
            <a href="/privacy" className="hover:text-black transition-colors">Privacy</a>
            <a href="/terms"   className="hover:text-black transition-colors">Terms</a>
            <a href="/cookies" className="hover:text-black transition-colors">Cookies</a>
            <a href="/faq"     className="hover:text-black transition-colors">FAQ</a>
            <a href="mailto:hello@reviewradar.com" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
