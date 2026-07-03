import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { goHome } from '@/store/showcaseSlice';
import { TEST_META, type BenchmarkTest } from '@/lib/houseData';

export function useTestPageLogic(): { test: BenchmarkTest | null; back: () => void } {
  const dispatch = useAppDispatch();
  const testId = useAppSelector(s => s.showcase.testId);
  const test = testId ? TEST_META[testId] : null;
  const back = () => { dispatch(goHome()); };
  return { test, back };
}
