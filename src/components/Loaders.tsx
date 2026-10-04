interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

export function Spinner({ size = 'md', label }: LoaderProps) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'
  const b = size === 'sm' ? 'border-[1.5px]' : 'border-2'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${s} ${b} border-neutral-200 border-t-black rounded-full animate-spin`} />
      {label && <p className="text-[11px] uppercase tracking-widest text-neutral-400">{label}</p>}
    </div>
  )
}

export function PulseBar() {
  return (
    <div className="flex items-end gap-1 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-neutral-800 rounded-full animate-pulse"
          style={{
            height: `${40 + Math.sin(i * 1.2) * 30}%`,
            animationDelay: `${i * 0.12}s`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-neutral-100 rounded animate-pulse`} />
}

export function ReviewSkeleton() {
  return (
    <div className="border border-neutral-100 p-5 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-neutral-100" />
        <div className="space-y-1.5 flex-1">
          <SkeletonLine w="w-32" h="h-3" />
          <SkeletonLine w="w-20" h="h-2" />
        </div>
        <SkeletonLine w="w-16" h="h-3" />
      </div>
      <SkeletonLine />
      <SkeletonLine w="w-4/5" />
      <SkeletonLine w="w-3/5" />
    </div>
  )
}
