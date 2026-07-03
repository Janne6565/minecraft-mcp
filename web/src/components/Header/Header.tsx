import { useAppDispatch } from '@/store/hooks';
import { goHome } from '@/store/showcaseSlice';

export function Header() {
  const dispatch = useAppDispatch();
  return (
    <div
      className="sticky top-0 z-10 border-b-2"
      style={{ background: '#fffdf8', borderColor: '#e6dfcd', padding: '18px 32px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          onClick={() => dispatch(goHome())}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter') dispatch(goHome()); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: 'fit-content' }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 4,
              background: 'linear-gradient(#6FAF3C 0 34%, #7A5230 34% 100%)',
              border: '2px solid #2b2718', flex: 'none',
            }}
          />
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 18, color: '#3d5a24', letterSpacing: 0.5,
            }}
          >
            BLOCKWORKS
          </div>
        </div>
        <div style={{ fontSize: 13, color: '#7a7460', marginLeft: 40 }}>
          AI Build Benchmarks — same prompt, every model, head to head
        </div>
      </div>
    </div>
  );
}
