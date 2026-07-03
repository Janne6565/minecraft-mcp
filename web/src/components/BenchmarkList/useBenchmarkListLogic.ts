import { useNavigate } from '@tanstack/react-router';
import { TESTS, housesForTest, stripeGradient, type BenchmarkTest } from '@/lib/houseData';

export interface BenchmarkCard extends BenchmarkTest {
  readonly thumbGradient: string;
  readonly buildCount: number;
  readonly onClick: (() => void) | null;
}

export function useBenchmarkListLogic() {
  const navigate = useNavigate();

  const cards: BenchmarkCard[] = TESTS.map(t => {
    const live = t.status === 'live';
    return {
      ...t,
      thumbGradient: stripeGradient(t.accent, t.accentSoft),
      buildCount: housesForTest(t.id).length,
      onClick: live
        ? () => { void navigate({ to: '/benchmark/$testId', params: { testId: t.id } }); }
        : null,
    };
  });

  return { cards };
}
