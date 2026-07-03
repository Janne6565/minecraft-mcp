import { useParams } from '@tanstack/react-router';
import type { TestKey } from './houseData';

/** Current benchmark test id from the route, or null on the home route. */
export function useTestId(): TestKey | null {
  const params = useParams({ strict: false });
  return (params.testId as TestKey | undefined) ?? null;
}
