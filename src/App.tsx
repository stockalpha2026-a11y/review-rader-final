import { useEffect, useState, type ReactElement, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getLocalSession, localSignOut, supabase } from './utils/supabaseClient'

// Route-level code splitting: each page becomes its own downloaded chunk,
// fetched only when that route is actually visited. Previously every page
// (including Dashboard's mock data and all its UI) was bundled into one
// file loaded on first visit, even for someone just viewing /terms.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login       = lazy(() => import('./pages/Login'))
const Signup      = lazy(() => import('./pages/Signup'))
const Dashboard   = lazy(() => import('./pages/Dashboard'))
const Terms       = lazy(() => import('./pages/Terms'))
const Privacy     = lazy(() => import('./pages/Privacy'))
const Cookies     = lazy(() => import('./pages/Cookies'))
const FAQ         = lazy(() => import('./pages/FAQ'))
const Expired     = lazy(() => import('./pages/Expired'))
const Renew       = lazy(() => import('./pages/Renew'))
const Admin       = lazy(() => import('./pages/Admin'))

type Session = { user: { id: string; email: string } } | null

function Private({ session, children }: { session: Session; children: ReactElement }) {
  const loc = useLocation()
  // Remember where they were going (e.g. the link in a payment email) so login can send them back.
  return session ? children : <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
}
function Public({ session, children }: { session: Session; children: ReactElement }) {
  const loc = useLocation()
  const from = (loc.state as { from?: unknown } | null)?.from
  const dest = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/dashboard'
  return session ? <Navigate to={dest} replace /> : children
}

function RouteLoading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="text-[11px] uppercase tracking-widest text-neutral-400 animate-pulse">Loading…</span>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session>(null)
  const [ready,   setReady]   = useState(false)

  useEffect(() => {
    // Check session on mount (covers demo session + real Supabase session)
    getLocalSession().then((s) => {
      setSession(s)
      setReady(true)
    })

    // Custom events — fired by the demo sign-in path and on sign-out,
    // which don't go through Supabase's own auth state machine.
    const handleLogin  = () => { getLocalSession().then((s) => setSession(s)) }
    const handleLogout = () => setSession(null)
    window.addEventListener('rr_login',  handleLogin)
    window.addEventListener('rr_logout', handleLogout)

    // Native Supabase auth events — covers real sign-in/sign-up,
    // token refresh, and server-side session expiry, so the UI never
    // gets stuck showing a stale logged-in (or logged-out) state.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Demo sessions aren't real Supabase sessions, so a null here
      // from Supabase shouldn't clobber an active demo login.
      const isDemoActive = !!localStorage.getItem('rr_demo_session')
      if (!newSession && isDemoActive) return
      setSession(newSession as Session)
    })

    return () => {
      window.removeEventListener('rr_login',  handleLogin)
      window.removeEventListener('rr_logout', handleLogout)
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (!ready) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <span className="text-[11px] uppercase tracking-widest text-neutral-400 animate-pulse">Loading ReviewRadar…</span>
    </div>
  )

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<Public  session={session}><Login    /></Public>} />
          <Route path="/signup"    element={<Public  session={session}><Signup   /></Public>} />
          <Route path="/dashboard" element={<Private session={session}><Dashboard /></Private>} />
          <Route path="/renew"     element={<Private session={session}><Renew /></Private>} />
          <Route path="/admin"     element={<Private session={session}><Admin /></Private>} />
          <Route path="/terms"     element={<Terms   />} />
          <Route path="/privacy"   element={<Privacy />} />
          <Route path="/cookies"   element={<Cookies />} />
          <Route path="/faq"       element={<FAQ     />} />
          <Route path="/expired"   element={<Expired />} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
