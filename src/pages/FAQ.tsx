import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import LegalLayout from '../components/LegalLayout'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Which platforms does ReviewRadar actually scrape?',
    a: 'Right now: Google Reviews and Reddit. We started narrow on purpose, so the sentiment analysis and alerts on those two sources are reliable rather than spread thin. More platforms (Trustpilot, TripAdvisor) are planned next.',
  },
  {
    q: 'Does ReviewRadar post replies for me automatically?',
    a: 'No. ReviewRadar drafts suggested replies using AI, but you always review and send them yourself, on the actual platform. We never post on your behalf without your action.',
  },
  {
    q: 'How often does it scan for new reviews?',
    a: 'The Basic and Max plans include the dashboard and morning reports, which are generated from the latest reviews we have collected for your business. The Starter plan is the NFC review card with basic review tracking.',
  },
  {
    q: 'What happens during the 14-day free trial?',
    a: 'Full access to your plan\'s features, no credit card required to start. If you don\'t add a payment method by the end of the trial, your account simply pauses — we don\'t auto-charge a card you never gave us.',
  },
  {
    q: 'Can I monitor more than one location?',
    a: 'Yes. Use "Add location" from your dashboard to connect another business and choose which platforms to monitor for it, independently of your other locations. If you run many locations, the Enterprise plan is built for that, so contact us.',
  },
  {
    q: 'How does the fake review flag work?',
    a: 'Some reviews show a flag noting why our system thinks they might not be genuine — patterns like generic praise with no specific detail, or several near-identical reviews posted within minutes of each other. It\'s a signal to investigate, not an automatic takedown — we don\'t have the power to remove a review from Google or Reddit ourselves.',
  },
  {
    q: 'Is my data secure?',
    a: 'Authentication runs through Supabase Auth with hashed passwords, not plain text. Your business data is protected by Row Level Security at the database level, meaning your account can only ever access your own data — this is enforced by the database itself, not just by app code. See our Privacy Policy for the full picture.',
  },
  {
    q: 'What if my password isn\'t working / sign-in is acting up?',
    a: 'Double-check there\'s no extra space in your email, and that you\'re using the password you originally set (not the demo one). If you\'re still stuck, email hello@reviewradar.com and we\'ll sort it out.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, from your account settings, anytime. Cancellation takes effect at the end of your current billing period — no cancellation fees, no retention calls.',
  },
  {
    q: 'Where is ReviewRadar based?',
    a: 'Jabalpur, Madhya Pradesh, India. We build for Indian small and mid-size businesses first.',
  },
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <LegalLayout title="Frequently asked questions" updated="29 June 2026">
      <div className="space-y-0 -mt-2">
        {FAQS.map((item, i) => {
          const open = openIdx === i
          return (
            <div key={item.q} className="border-b border-neutral-100">
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
              >
                <span className="text-sm font-semibold text-black group-hover:text-neutral-700 transition-colors">{item.q}</span>
                <ChevronDown className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
              </button>
              <div
                className="overflow-hidden transition-all duration-200 ease-out"
                style={{ maxHeight: open ? '300px' : '0px', opacity: open ? 1 : 0 }}
              >
                <p className="text-sm font-light text-neutral-500 leading-relaxed pb-5 pr-8">{item.a}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="pt-4">
        <p className="text-sm font-light text-neutral-500">
          Didn't find what you needed? Email us at{' '}
          <a href="mailto:hello@reviewradar.com" className="text-black font-semibold underline">hello@reviewradar.com</a>
          {' '}— a real person reads these.
        </p>
      </div>
    </LegalLayout>
  )
}
