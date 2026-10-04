import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export default function LegalLayout({ title, updated, children }: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-black tracking-tight flex items-center gap-1.5 text-sm">
            ReviewRadar
            <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          </Link>
          <nav className="flex items-center gap-6 text-[11px] tracking-widest uppercase text-neutral-400">
            <Link to="/faq" className="hover:text-black transition-colors hidden sm:inline">FAQ</Link>
            <Link to="/login" className="hover:text-black transition-colors">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-6 py-16">
        <div className="max-w-2xl mx-auto space-y-10">
          <div className="space-y-2 border-b border-neutral-100 pb-8">
            <h1 className="text-3xl font-bold text-black tracking-tight">{title}</h1>
            <p className="text-[11px] uppercase tracking-widest text-neutral-400">Last updated {updated}</p>
          </div>
          <div className="legal-prose space-y-8 text-sm font-light text-neutral-600 leading-relaxed">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-100 bg-neutral-50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
          <span className="font-bold text-black text-sm flex items-center gap-1.5">
            ReviewRadar <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          </span>
          <p className="text-[11px] text-neutral-400">© {new Date().getFullYear()} ReviewRadar. All rights reserved.</p>
          <div className="flex gap-6 text-[11px] text-neutral-400 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link to="/terms"   className="hover:text-black transition-colors">Terms</Link>
            <Link to="/cookies" className="hover:text-black transition-colors">Cookies</Link>
            <Link to="/faq"     className="hover:text-black transition-colors">FAQ</Link>
            <a href="mailto:hello@reviewradar.com" className="hover:text-black transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        .legal-prose h2 { font-size: 0.95rem; font-weight: 700; color: #000; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
        .legal-prose p { margin-bottom: 0; }
        .legal-prose ul { list-style: none; padding: 0; margin: 0.5rem 0 0 0; }
        .legal-prose li { padding-left: 1.1rem; position: relative; margin-bottom: 0.4rem; }
        .legal-prose li::before { content: '—'; position: absolute; left: 0; color: #00d4aa; }
        .legal-prose section { padding-top: 0; }
        .legal-prose strong { color: #000; font-weight: 600; }
      `}</style>
    </div>
  )
}
