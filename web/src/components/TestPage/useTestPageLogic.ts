import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppDispatch } from '@/store/hooks';
import { resetTestView } from '@/store/showcaseSlice';
import { useTestId } from '@/lib/routing';
import { TEST_META, type BenchmarkTest } from '@/lib/houseData';

export function useTestPageLogic(): { test: BenchmarkTest | null; back: () => void } {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const testId = useTestId();
  const test = testId ? TEST_META[testId] : null;

  // Entering (or switching) a benchmark starts from a clean, unfiltered view.
  useEffect(() => { dispatch(resetTestView()); }, [dispatch, testId]);

  const back = () => { void navigate({ to: '/' }); };
  return { test, back };
}
