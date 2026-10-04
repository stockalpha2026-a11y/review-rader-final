// Real Jabalpur cafes (Google Place IDs) that the onboarding search offers.
// The old fake businesses (Sharma Dhaba, Cafe Coco...) and fake reviews/reports are gone.
// Reviews now come from the `reviews` table; reports are computed in analysis.ts.
// NOTE: this is still a fixed list, not live Google search. A live Places search
// needs its own Edge Function (next step).
export const SEARCHABLE_BUSINESSES = [
  { place_id: 'ChIJWXVE9FqvgTkRz2FJHcAe2y0', name: 'The Coffee Concept Jabalpur', address: 'Wright Town, Jabalpur, Madhya Pradesh', rating: 4.5, total_ratings: 249,  type: 'cafe', email: '', business_id: 'COFFEECONCEPT' },
  { place_id: 'ChIJr0NHJR6vgTkRDzxayHrBmJQ', name: 'Meraki The Art Cafe',          address: 'Wright Town, Jabalpur, Madhya Pradesh', rating: 4.6, total_ratings: 930,  type: 'cafe', email: '', business_id: 'MERAKI' },
  { place_id: 'ChIJizTaaQCvgTkRk4Wk8HuIbBk', name: 'Nothing Before Coffee',        address: 'Wright Town, Jabalpur, Madhya Pradesh', rating: 4.7, total_ratings: 898,  type: 'cafe', email: '', business_id: 'NBC' },
  { place_id: 'ChIJn38TVuGvgTkRKVt3spainUw', name: 'House Of Blends',              address: 'Wright Town, Jabalpur, Madhya Pradesh', rating: 4.0, total_ratings: 1232, type: 'cafe', email: '', business_id: 'HOB' },
  { place_id: 'ChIJfaBmPy2tgTkR6YKrHU0bCJE', name: 'The Highbrooks Cafe',          address: 'Rampur, Jabalpur, Madhya Pradesh',      rating: 4.5, total_ratings: 132,  type: 'cafe', email: '', business_id: 'HIGHBROOKS' },
  { place_id: 'ChIJM_I9eKKxgTkR9n3015jkicw', name: 'Pablo Barrel House',           address: 'Vijay Nagar, Jabalpur, Madhya Pradesh', rating: 3.9, total_ratings: 260,  type: 'bar',  email: '', business_id: 'PABLO' },
]

// ── Source platforms ───────────────────────────────────────────
// Twitter/X and LinkedIn removed — scraping is scoped to Google
// and Reddit for now. Re-add here (and PLATFORM_ICONS in
// Dashboard.tsx) if those sources come back later.
export const PLATFORMS = [
  { id: 'google',      label: 'Google Reviews',  icon: '🔍', available: true,  desc: 'Monitor your Google Business reviews daily' },
  { id: 'reddit',      label: 'Reddit',           icon: '🟠', available: true,  desc: 'Track brand mentions across subreddits' },
  { id: 'trustpilot',  label: 'Trustpilot',       icon: '⭐', available: false, desc: 'Coming soon — Trustpilot review monitoring' },
  { id: 'tripadvisor', label: 'TripAdvisor',      icon: '🦉', available: false, desc: 'Coming soon — TripAdvisor monitoring' },
]
