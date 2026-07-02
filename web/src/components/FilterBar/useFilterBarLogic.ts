import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setModelFilter, setEffortFilter } from '@/store/showcaseSlice';
import type { ModelKey, EffortKey } from '@/lib/houseData';

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

const MODEL_DEFS: { value: ModelKey | 'all'; label: string }[] = [
  { value: 'all',    label: 'All Models' },
  { value: 'fable',  label: 'Fable 5' },
  { value: 'deepseek', label: 'DeepSeek V4 Pro' },
  { value: 'deepseek-flash', label: 'DeepSeek V4 Flash' },
  { value: 'haiku', label: 'Haiku 4.5' },
  { value: 'opus', label: 'Opus 4.8' },
  { value: 'opus-46', label: 'Opus 4.6' },
  { value: 'sonnet', label: 'Sonnet 4.6' },
];

const EFFORT_DEFS: { value: EffortKey | 'all'; label: string }[] = [
  { value: 'all',    label: 'All Efforts' },
  { value: 'max',    label: 'Max' },
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
];

export function useFilterBarLogic() {
  const dispatch = useAppDispatch();
  const modelFilter = useAppSelector(s => s.showcase.modelFilter);
  const effortFilter = useAppSelector(s => s.showcase.effortFilter);

  const modelOptions = MODEL_DEFS.map(o => ({
    ...o,
    style: chipStyle(o.value === modelFilter),
    onClick: () => { dispatch(setModelFilter(o.value)); },
  }));

  const effortOptions = EFFORT_DEFS.map(o => ({
    ...o,
    style: chipStyle(o.value === effortFilter),
    onClick: () => { dispatch(setEffortFilter(o.value)); },
  }));

  return { modelOptions, effortOptions };
}
