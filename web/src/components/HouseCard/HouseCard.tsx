import type { House } from '@/lib/houseData';
import { MODEL_META, EFFORT_META } from '@/lib/houseData';
import { MiniVoxelViewer } from '@/components/VoxelViewer';

interface HouseCardProps {
  readonly house: House;
  readonly onClick: () => void;
}

const UNFILLED_PIP = '#e4dfd3';

export function HouseCard({ house, onClick }: HouseCardProps) {
  const mm = MODEL_META[house.model];
  const em = EFFORT_META[house.effort];
  const pipCount = Math.max(em.pips, 3); // always show at least 3 slots
  const pips = Array.from({ length: pipCount }, (_, i) => i < em.pips ? mm.accent : UNFILLED_PIP);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      style={{
        background: '#fff', borderRadius: 10, overflow: 'hidden',
        border: '2px solid #e9e2d0', cursor: 'pointer',
        transition: 'transform .15s ease, box-shadow .15s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 14px 26px rgba(0,0,0,.12)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#d8cfb6';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 2px rgba(0,0,0,.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = '#e9e2d0';
      }}
    >
      <div style={{ height: 150, borderBottom: '2px solid #e9e2d0', pointerEvents: 'none' }}>
        <MiniVoxelViewer model={house.model} effort={house.effort} />
      </div>
      <CardBody mm={mm} em={em} pips={pips} />
    </div>
  );
}

function CardBody({ mm, em, pips }: {
  readonly mm: typeof MODEL_META[keyof typeof MODEL_META];
  readonly em: typeof EFFORT_META[keyof typeof EFFORT_META];
  readonly pips: readonly string[];
}) {
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
          letterSpacing: 0.5, padding: '3px 8px', borderRadius: 5,
          background: mm.accentSoft, color: mm.accentDark, border: `1px solid ${mm.accent}`,
        }}>
          {mm.label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {pips.map((color, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: 1.5, background: color }} />
          ))}
          <span style={{ fontSize: 11, color: '#948d75', marginLeft: 4 }}>{em.label}</span>
        </div>
      </div>
    </div>
  );
}
