interface Segment {
  label: string
  value: number
  color: string
}

export function SentimentDonut({ good, medium, bad }: { good: number; medium: number; bad: number }) {
  const total = good + medium + bad
  const segments: Segment[] = [
    { label: 'Good (4–5★)',   value: good,   color: '#00d4aa' },
    { label: 'Medium (3★)',   value: medium, color: '#d4a017' },
    { label: 'Bad (1–2★)',    value: bad,    color: '#ef4444' },
  ]

  const radius = 70
  const stroke = 26
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="flex items-center gap-8 flex-wrap">
      <div className="relative shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          {/* Track */}
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f5f5f5" strokeWidth={stroke} />
          {total === 0 ? null : segments.map((seg) => {
            if (seg.value === 0) return null
            const fraction = seg.value / total
            const dash = fraction * circumference
            const gap = circumference - dash
            const offset = -(cumulative / total) * circumference
            cumulative += seg.value
            return (
              <circle
                key={seg.label}
                cx="90" cy="90" r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-black">{total}</span>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400">reviews</span>
        </div>
      </div>

      <div className="space-y-3 flex-1 min-w-[180px]">
        {segments.map((seg) => {
          const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0
          return (
            <div key={seg.label} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-neutral-600 flex-1">{seg.label}</span>
              <span className="text-xs font-bold text-black tabular-nums">{seg.value}</span>
              <span className="text-[10px] text-neutral-400 w-9 text-right tabular-nums">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
