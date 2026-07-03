import { PromptBox } from '@/components/PromptBox';
import { useBenchmarkListLogic, type BenchmarkCard } from './useBenchmarkListLogic';

export function BenchmarkList() {
  const { cards } = useBenchmarkListLogic();
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px 64px' }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#2b2718' }}>The Benchmarks</div>
        <div style={{ fontSize: 14, color: '#8a8468', marginTop: 6, maxWidth: 560, lineHeight: 1.5 }}>
          Every model gets the same prompt at several effort levels. Pick a test to see what they built.
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
        {cards.map(card => <TestCard key={card.id} card={card} />)}
      </div>
    </div>
  );
}

function TestCard({ card }: { readonly card: BenchmarkCard }) {
  const live = card.status === 'live';
  return (
    <div
      onClick={card.onClick ?? undefined}
      role={live ? 'button' : undefined}
      tabIndex={live ? 0 : undefined}
      onKeyDown={e => { if (live && e.key === 'Enter') card.onClick?.(); }}
      style={{
        background: '#fff', borderRadius: 12, overflow: 'hidden',
        border: '2px solid #e9e2d0', cursor: live ? 'pointer' : 'default',
        transition: 'transform .15s ease, box-shadow .15s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        opacity: live ? 1 : 0.72,
      }}
      onMouseEnter={live ? e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 14px 26px rgba(0,0,0,.12)';
        el.style.borderColor = '#d8cfb6';
      } : undefined}
      onMouseLeave={live ? e => {
        const el = e.currentTarget;
        el.style.transform = '';
        el.style.boxShadow = '0 1px 2px rgba(0,0,0,.04)';
        el.style.borderColor = '#e9e2d0';
      } : undefined}
    >
      <div style={{
        height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: card.thumbGradient, borderBottom: '2px solid #e9e2d0',
      }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: card.accentDark,
          background: 'rgba(255,255,255,.75)', padding: '10px 14px', borderRadius: 6,
          border: `2px solid ${card.accent}`,
        }}>
          {card.glyph}
        </div>
      </div>
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#2b2718' }}>{card.name}</div>
          <div style={{ fontSize: 13, color: '#8a8468', marginTop: 4, lineHeight: 1.5 }}>{card.blurb}</div>
        </div>
        <PromptBox prompt={card.challenge} lines={4} fontSize={12} padding="10px 12px" borderRadius={7} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
            letterSpacing: 0.5, padding: '3px 8px', borderRadius: 5,
            background: live ? card.accentSoft : '#f0ebdd',
            color: live ? card.accentDark : '#948d75',
            border: `1px solid ${live ? card.accent : '#e0d8bf'}`,
          }}>
            {live ? `${card.buildCount} BUILDS` : 'COMING SOON'}
          </div>
          {live && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#5B8C3E' }}>View results →</div>
          )}
        </div>
      </div>
    </div>
  );
}
