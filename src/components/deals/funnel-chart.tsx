import { formatCurrency } from '@/lib/format'

interface FunnelStage {
  id: string
  name: string
  color: string
  count: number
  value: number
}

interface Props {
  stages: FunnelStage[]
}

// Quadratic bezier Y at parameter t
function qbY(t: number, y0: number, y1: number, y2: number) {
  return (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * y1 + t * t * y2
}

export function FunnelChart({ stages }: Props) {
  if (stages.length === 0) return null

  const n      = stages.length
  const W      = 900
  const H      = 180
  const segW   = W / n
  const tipGap = H * 0.32   // gap from center at the tip (controls how narrow)
  const cpGap  = tipGap * 0.2  // bezier control point — slight inward bow

  // Top edge: quadratic bezier from (0,0) to (W, tipGap), cp at (W/2, cpGap)
  const topEdgeY = (t: number) => qbY(t, 0, cpGap, tipGap)
  const botEdgeY = (t: number) => H - topEdgeY(t)

  // SVG path for the full funnel shape (reused per segment via clipPath)
  const path = `M 0,0 Q ${W / 2},${cpGap} ${W},${tipGap} L ${W},${H - tipGap} Q ${W / 2},${H - cpGap} 0,${H} Z`

  return (
    <div className="border-t border-border/40 pt-6">
      <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase mb-4">
        Funil de conversão
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 176, display: 'block' }}
      >
        <defs>
          {stages.map((_, i) => (
            <clipPath key={i} id={`fcs-${i}`}>
              {/* Each segment is a vertical slice of the funnel */}
              <rect x={i * segW} y={0} width={segW + 1} height={H} />
            </clipPath>
          ))}
        </defs>

        {stages.map((stage, i) => {
          const t      = (i + 0.5) / n   // parametric center of this segment
          const cx     = (i + 0.5) * segW
          const cy     = H / 2
          const visH   = botEdgeY(t) - topEdgeY(t)   // visible height at segment center
          const showN  = visH > 36
          const showLb = visH > 70

          return (
            <g key={stage.id}>
              {/* Segment fill — full funnel shape, clipped to this column */}
              <path d={path} fill={stage.color} clipPath={`url(#fcs-${i})`} />

              {/* White divider at right boundary (skip last) */}
              {i < n - 1 && (() => {
                const tx = (i + 1) / n
                return (
                  <line
                    x1={(i + 1) * segW} y1={topEdgeY(tx) + 1}
                    x2={(i + 1) * segW} y2={botEdgeY(tx) - 1}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="2.5"
                  />
                )
              })()}

              {/* Count number */}
              {showN && (
                <text
                  x={cx} y={showLb ? cy - 13 : cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={28} fontWeight="800"
                  fontFamily="system-ui,sans-serif"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.22)', strokeWidth: 6 }}
                >
                  {stage.count}
                </text>
              )}

              {/* Stage label */}
              {showLb && (
                <text
                  x={cx} y={cy + 17}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.9)" fontSize={12} fontWeight="600"
                  fontFamily="system-ui,sans-serif"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.18)', strokeWidth: 4 }}
                >
                  {stage.name}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Labels below each segment */}
      <div className="flex mt-3">
        {stages.map((stage, i) => {
          const prev = stages[i - 1]
          const conv = prev && prev.count > 0
            ? Math.round((stage.count / prev.count) * 100)
            : null

          return (
            <div key={stage.id} className="flex-1 flex flex-col items-center gap-0.5 px-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <span className="text-xs font-bold">{stage.count}</span>
                {conv !== null && (
                  <span className="text-[10px] text-muted-foreground">↓{conv}%</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                {stage.name}
              </span>
              {stage.value > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  {formatCurrency(stage.value)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {n > 1 && stages[0].count > 0 && (
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Conversão geral:{' '}
          <span className="font-semibold text-foreground">
            {Math.round(((stages[n - 1]?.count ?? 0) / stages[0].count) * 100)}%
          </span>
          {' '}chegam ao fundo do funil
        </p>
      )}
    </div>
  )
}
