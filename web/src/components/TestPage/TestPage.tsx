import { FilterBar } from '@/components/FilterBar';
import { HouseGrid } from '@/components/HouseGrid';
import { useTestPageLogic } from './useTestPageLogic';

export function TestPage() {
  const { test, back } = useTestPageLogic();
  if (!test) return null;

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 32px 64px' }}>
      <BackButton onClick={back} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
        <div style={{ maxWidth: 620 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2b2718' }}>{test.name}</div>
          <div style={{ fontSize: 14, color: '#8a8468', marginTop: 6, lineHeight: 1.5 }}>{test.blurb}</div>
        </div>
        <div style={{
          background: '#241f18', color: '#c9e4a8', fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13, borderRadius: 8, padding: '12px 16px', lineHeight: 1.5, maxWidth: 480,
        }}>
          &gt; {test.challenge}
        </div>
      </div>

      <FilterBar />
      <HouseGrid />
    </div>
  );
}

function BackButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        padding: 0, fontSize: 13, fontWeight: 700, color: '#5B8C3E', cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
      }}
      onMouseEnter={e => { e.currentTarget.style.color = '#3d5a24'; }}
      onMouseLeave={e => { e.currentTarget.style.color = '#5B8C3E'; }}
    >
      ← All benchmarks
    </button>
  );
}
