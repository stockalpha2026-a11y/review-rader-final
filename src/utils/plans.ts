// Single source of truth for plan prices on the Renew page.
// Keep in sync with the PLANS array in LandingPage.tsx.
export const PLAN_LIST = [
  { id: 'starter', name: 'Starter', monthly: 599,  annual: 499 },
  { id: 'basic',   name: 'Basic',   monthly: 999,  annual: 799 },
  { id: 'max',     name: 'Max',     monthly: 1299, annual: 999 },
] as const

export type PlanId = typeof PLAN_LIST[number]['id']
export type Billing = 'monthly' | 'annual'

export const priceFor = (planId: string, billing: Billing) => {
  const p = PLAN_LIST.find(x => x.id === planId) || PLAN_LIST[1]
  // Annual = discounted monthly rate x 12, billed once (as shown on the pricing page).
  return billing === 'annual' ? p.annual * 12 : p.monthly
}
export const daysFor = (billing: Billing) => (billing === 'annual' ? 365 : 30)
