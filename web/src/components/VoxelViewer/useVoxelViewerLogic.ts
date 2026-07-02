import { useEffect, useRef, useState } from 'react';
import { loadHouseVoxels } from '@/lib/houseLoader';
import { initScene } from './lib';
import type { ModelKey, EffortKey } from '@/lib/houseData';

export function useVoxelViewerLogic(model: ModelKey, effort: EffortKey) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let handle: { dispose(): void } | null = null;
    setLoading(true);

    void (async () => {
      try {
        const voxels = await loadHouseVoxels(model, effort);
        if (disposed) return;
        const h = await initScene(canvas, voxels);
        if (disposed) { h.dispose(); return; }
        handle = h;
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
      handle?.dispose();
    };
  }, [model, effort]);

  return { canvasRef, loading };
}
