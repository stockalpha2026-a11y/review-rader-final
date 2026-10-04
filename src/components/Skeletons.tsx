// Skeleton placeholders that mirror the real dashboard layout (see
// src/pages/Dashboard.tsx) so the page doesn't "jump" once real data
// arrives — same borders, spacing and grid columns as the components
// they stand in for, just with pulsing neutral blocks instead of text.
//
// Built on top of the existing SkeletonLine/Spinner primitives in
// Loaders.tsx rather than inventing a second skeleton language.
import { SkeletonLine, Spinner } from './Loaders'

// ── Stat card ───────────────────────────────────────────────────
// Mirrors StatCard in Dashboard.tsx: border border-neutral-200 px-5 py-4,
// a label row with a small icon on the right, a big number, a sub line.
export function StatCardSkeleton() {
  return (
    <div className="border border-neutral-200 px-5 py-4 space-y-2 animate-pulse">
      <div className="flex items-center justify-between">
        <SkeletonLine w="w-20" h="h-2" />
        <div className="h-3.5 w-3.5 bg-neutral-100 rounded-sm shrink-0" />
      </div>
      <SkeletonLine w="w-14" h="h-6" />
      <SkeletonLine w="w-28" h="h-2.5" />
    </div>
  )
}

// ── Chart area ──────────────────────────────────────────────────
// Covers both chart shapes used on the dashboard: the sentiment donut
// (SentimentDonut.tsx) and the weekly trend bars (WeeklyReport in
// Dashboard.tsx). Pass the variant that matches what's loading.
export function ChartSkeleton({ variant = 'donut' }: { variant?: 'donut' | 'bars' }) {
  if (variant === 'bars') {
    const heights = [35, 55, 40, 70, 50, 85, 60, 45, 90, 65, 50, 75]
    return (
      <div className="border border-neutral-100 p-6 space-y-4 animate-pulse">
        <SkeletonLine w="w-44" h="h-2.5" />
        <div className="flex items-end gap-2 h-40">
          {heights.map((h, i) => (
            <div key={i} className="flex-1 bg-neutral-100 rounded-sm" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="flex gap-2">
          {heights.map((_, i) => (
            <SkeletonLine key={i} w="flex-1" h="h-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-neutral-100 p-6 animate-pulse">
      <SkeletonLine w="w-44" h="h-2.5" />
      <div className="flex items-center gap-8 flex-wrap mt-4">
        <div className="relative shrink-0 h-[180px] w-[180px] rounded-full border-[26px] border-neutral-100" />
        <div className="space-y-3 flex-1 min-w-[180px]">
          {[0, 1, 2].map(i => (
            <div key={i} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 bg-neutral-100 shrink-0" />
              <SkeletonLine w="flex-1" h="h-2.5" />
              <SkeletonLine w="w-6" h="h-2.5" />
              <SkeletonLine w="w-9" h="h-2.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Review list ─────────────────────────────────────────────────
// Mirrors ReviewCard + its `grid md:grid-cols-2 gap-3` wrapper.
function ReviewRowSkeleton() {
  return (
    <div className="border border-neutral-100 p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-neutral-100 shrink-0" />
          <div className="space-y-1">
            <SkeletonLine w="w-24" h="h-2.5" />
            <SkeletonLine w="w-14" h="h-2" />
          </div>
        </div>
        <SkeletonLine w="w-16" h="h-2.5" />
      </div>
      <SkeletonLine h="h-2.5" />
      <SkeletonLine w="w-4/5" h="h-2.5" />
    </div>
  )
}

export function ReviewListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewRowSkeleton key={i} />
      ))}
    </div>
  )
}

// ── Sub-tab bar ─────────────────────────────────────────────────
// Mirrors the "Platform Breakdown / Reviews / AI Report" tab strip.
function SubTabsSkeleton() {
  return (
    <div className="border-b border-neutral-100 flex gap-6 px-1 animate-pulse">
      {['w-32', 'w-24', 'w-20'].map((w, i) => (
        <div key={i} className="py-3">
          <SkeletonLine w={w} h="h-2.5" />
        </div>
      ))}
    </div>
  )
}

// ── Full dashboard ──────────────────────────────────────────────
// The overview tab end to end: 4 stat cards, the sentiment chart, the
// sub-tab strip, and a handful of review rows. Used on its own while a
// business's data is loading, and as the base of FetchingReviewsState.
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <ChartSkeleton variant="donut" />
      <SubTabsSkeleton />
      <ReviewListSkeleton count={4} />
    </div>
  )
}

// ── Post-onboarding fetching state ───────────────────────────────
// Shown right after onboarding completes, while the first batch of
// reviews is still being pulled in the background. Pairs a short status
// line with the dashboard skeleton underneath, so the page already
// looks like the dashboard the person is about to land on.
export function FetchingReviewsState({ businessName }: { businessName?: string }) {
  return (
    <div className="space-y-6">
      <div className="border border-neutral-100 px-5 py-4 flex items-center gap-3">
        <Spinner size="sm" />
        <div>
          <p className="text-xs font-bold text-black">
            {businessName ? `Fetching reviews for ${businessName}…` : 'Fetching your reviews…'}
          </p>
          <p className="text-[11px] text-neutral-400">This can take up to a minute on the first pull.</p>
        </div>
      </div>
      <DashboardSkeleton />
    </div>
  )
}
