interface FunnelStage {
  id: string
  name: string
  count: number
  is_won: boolean
}

const ZINC = [
  ['#09090b', '#18181b'],
  ['#18181b', '#27272a'],
  ['#27272a', '#3f3f46'],
  ['#3f3f46', '#52525b'],
  ['#52525b', '#71717a'],
  ['#71717a', '#a1a1aa'],
  ['#a1a1aa', '#d4d4d8'],
  ['#d4d4d8', '#e4e4e7'],
]

export function VerticalFunnel({ stages }: { stages: FunnelStage[] }) {
  if (stages.length === 0) return null

  const bandH = 62

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 65% 100%, 35% 100%)',
          width: '85%',
          height: stages.length * bandH,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {stages.map((stage, i) => {
          const [from, to] = ZINC[Math.min(i, ZINC.length - 1)]
          return (
            <div
              key={stage.id}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: `linear-gradient(90deg, ${from} 0%, ${to} 50%, ${from} 100%)`,
                borderBottom: i < stages.length - 1 ? '2px solid #000' : 'none',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#d4d4d8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '0.15rem',
                  textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  lineHeight: 1,
                }}
              >
                {stage.name}
              </span>
              <span
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: stage.is_won ? '#4ade80' : '#ffffff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                  lineHeight: 1,
                }}
              >
                {stage.count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
