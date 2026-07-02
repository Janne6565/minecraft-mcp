import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearSelection } from '@/store/showcaseSlice';
import { HOUSES, MODEL_META, EFFORT_META } from '@/lib/houseData';

const UNFILLED_PIP = '#e4dfd3';

export function useHouseDetailLogic() {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector(s => s.showcase.selectedId);

  const raw = HOUSES.find(h => h.id === selectedId) ?? null;

  const house = raw ? (() => {
    const mm = MODEL_META[raw.model];
    const em = EFFORT_META[raw.effort];
    const pips = [0, 1, 2].map(i => ({ color: i < em.pips ? mm.accent : UNFILLED_PIP }));
    return { ...raw, mm, em, pips };
  })() : null;

  const close = () => { dispatch(clearSelection()); };

  useEffect(() => {
    if (!house) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    globalThis.addEventListener('keydown', onKey);
    return () => { globalThis.removeEventListener('keydown', onKey); };
  }, [house]); // eslint-disable-line react-hooks/exhaustive-deps

  return { house, close };
}
