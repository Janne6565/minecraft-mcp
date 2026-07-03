import { VoxelViewer } from '@/components/VoxelViewer';
import { useHouseDetailLogic } from './useHouseDetailLogic';

export function HouseDetail() {
  const { house, close } = useHouseDetailLogic();
  if (!house) return null;

  const { mm, em, pips } = house;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(22,18,10,.6)', backdropFilter: 'blur(3px)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto', padding: '40px 20px' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ position: 'relative', background: '#fffdf8', borderRadius: 16, maxWidth: 1080, width: '100%', boxShadow: '0 30px 70px rgba(0,0,0,.4)', overflow: 'hidden', display: 'flex', flexWrap: 'wrap' }}>
        <CloseButton onClose={close} />
        <VoxelViewer model={house.model} effort={house.effort} />
        <InfoPanel house={house} mm={mm} em={em} pips={pips} />
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { readonly onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.35)', color: '#fff', fontSize: 16, cursor: 'pointer', zIndex: 2, fontFamily: "'Inter', sans-serif" }}
    >
      ✕
    </button>
  );
}

function InfoPanel({ house, mm, em, pips }: {
  readonly house: ReturnType<typeof useHouseDetailLogic>['house'] & object;
  readonly mm: { label: string; tag: string; accent: string; accentSoft: string; accentDark: string };
  readonly em: { label: string };
  readonly pips: readonly { color: string }[];
}) {
  if (!house) return null;
  return (
    <div style={{ flex: '1 1 380px', padding: 36, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <ModelTag mm={mm} />
          <PipRow pips={pips} effortLabel={`${em.label} Effort`} size={8} />
          <div style={{ fontSize: 11, color: '#948d75', background: '#f0ebdd', padding: '4px 9px', borderRadius: 5, fontWeight: 600 }}>
            {house.testName}
          </div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#2b2718', lineHeight: 1.15 }}>
          {mm.label} · {em.label} Effort
        </div>
      </div>

      <StatsRow house={house} />
      <PromptBox prompt={house.prompt} />
    </div>
  );
}

function ModelTag({ mm }: { readonly mm: { label: string; accent: string; accentSoft: string; accentDark: string } }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, padding: '4px 9px', borderRadius: 5, background: mm.accentSoft, color: mm.accentDark, border: `1px solid ${mm.accent}` }}>
      {mm.label}
    </div>
  );
}

function PipRow({ pips, effortLabel, size }: { readonly pips: readonly { color: string }[]; readonly effortLabel: string; readonly size: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {pips.map((p, i) => <div key={i} style={{ width: size, height: size, borderRadius: 2, background: p.color }} />)}
      <span style={{ fontSize: size < 8 ? 11 : 12, color: '#948d75', marginLeft: 4 }}>{effortLabel} Effort</span>
    </div>
  );
}

function StatsRow({ house }: { readonly house: { blocks: number; blockTypes: number; buildTime: string } }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
      <StatCell value={house.blocks.toLocaleString()} label="Blocks Placed" />
      <StatCell value={String(house.blockTypes)} label="Block Types" />
      <StatCell value={house.buildTime} label="Gen Time" />
    </div>
  );
}

function StatCell({ value, label }: { readonly value: string; readonly label: string }) {
  return (
    <div style={{ background: '#f5f1e8', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#2b2718' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: '#948d75', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PromptBox({ prompt }: { readonly prompt: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#948d75', marginBottom: 8 }}>Test Prompt</div>
      <div style={{ background: '#241f18', color: '#c9e4a8', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, borderRadius: 8, padding: '12px 14px', lineHeight: 1.5 }}>
        &gt; {prompt}
      </div>
    </div>
  );
}
