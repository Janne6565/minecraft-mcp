import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setModelFilter, setEffortFilter } from '@/store/showcaseSlice';
import { MODEL_META, EFFORT_META, housesForTest, type ModelKey, type EffortKey } from '@/lib/houseData';
import { useTestId } from '@/lib/routing';

const ACTIVE_BG = '#5B8C3E';
const ACTIVE_BORDER = '#5B8C3E';
const INACTIVE_BORDER = '#ddd6c7';
const INACTIVE_COLOR = '#55503f';

function chipStyle(active: boolean) {
  return {
    background: active ? ACTIVE_BG : '#ffffff',
    borderColor: active ? ACTIVE_BORDER : INACTIVE_BORDER,
    color: active ? '#ffffff' : INACTIVE_COLOR,
  };
}

// Canonical display order; only options actually present in the test are shown.
const MODEL_ORDER: ModelKey[] = ['opus', 'opus-46', 'sonnet', 'haiku', 'fable', 'deepseek', 'deepseek-flash'];
const EFFORT_ORDER: EffortKey[] = ['max', 'high', 'medium', 'low'];

export function useFilterBarLogic() {
  const dispatch = useAppDispatch();
  const testId = useTestId();
  const modelFilter = useAppSelector(s => s.showcase.modelFilter);
  const effortFilter = useAppSelector(s => s.showcase.effortFilter);

  const houses = testId ? housesForTest(testId) : [];
  const presentModels = new Set(houses.map(h => h.model));
  const presentEfforts = new Set(houses.map(h => h.effort));

  const modelDefs: { value: ModelKey | 'all'; label: string }[] = [
    { value: 'all', label: 'All Models' },
    ...MODEL_ORDER.filter(m => presentModels.has(m)).map(m => ({ value: m, label: MODEL_META[m].label })),
  ];
  const effortDefs: { value: EffortKey | 'all'; label: string }[] = [
    { value: 'all', label: 'All Efforts' },
    ...EFFORT_ORDER.filter(e => presentEfforts.has(e)).map(e => ({ value: e, label: EFFORT_META[e].label })),
  ];

  const modelOptions = modelDefs.map(o => ({
    ...o,
    style: chipStyle(o.value === modelFilter),
    onClick: () => { dispatch(setModelFilter(o.value)); },
  }));

  const effortOptions = effortDefs.map(o => ({
    ...o,
    style: chipStyle(o.value === effortFilter),
    onClick: () => { dispatch(setEffortFilter(o.value)); },
  }));

  return { modelOptions, effortOptions };
}
