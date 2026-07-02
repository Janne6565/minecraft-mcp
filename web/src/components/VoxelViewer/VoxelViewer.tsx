import { useEffect, useState } from 'react';
import type { ModelKey, EffortKey } from '@/lib/houseData';
import { loadHouseVoxels } from '@/lib/houseLoader';
import { renderThumbnail } from './lib';
import { useVoxelViewerLogic } from './useVoxelViewerLogic';

function LoadingOverlay({ label, small }: { readonly label: string; readonly small?: boolean }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#1a1f2e',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: small ? 8 : 12,
    }}>
      <div className="voxel-spinner" style={small ? { width: 18, height: 18, borderWidth: 2 } : undefined} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: small ? 10 : 11, color: '#5a6a80', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

export function MiniVoxelViewer({ model, effort }: { readonly model: ModelKey; readonly effort: EffortKey }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const voxels = await loadHouseVoxels(model, effort);
      if (cancelled) return;
      try {
        const url = await renderThumbnail(voxels);
        if (!cancelled) setSrc(url);
      } catch { /* WebGL unavailable */ }
    })();
    return () => { cancelled = true; };
  }, [model, effort]);

  if (!src) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <LoadingOverlay label="LOADING" small />
      </div>
    );
  }

  return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
}

interface VoxelViewerProps {
  readonly model: ModelKey;
  readonly effort: EffortKey;
}

export function VoxelViewer({ model, effort }: VoxelViewerProps) {
  const { canvasRef, loading } = useVoxelViewerLogic(model, effort);
  return (
    <div style={{ flex: '1 1 420px', background: '#1a1f2e', position: 'relative', minHeight: 420 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {loading && <LoadingOverlay label="BUILDING SCENE…" />}
      {!loading && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#8090a0',
          background: 'rgba(0,0,0,.4)', padding: '4px 10px', borderRadius: 4,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          drag to rotate · scroll to zoom · wasd + space/shift to fly
        </div>
      )}
    </div>
  );
}
