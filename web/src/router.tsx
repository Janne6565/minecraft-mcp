import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { RootLayout } from '@/components/RootLayout';
import { BenchmarkList } from '@/components/BenchmarkList';
import { TestPage } from '@/components/TestPage';
import { TEST_META, type TestKey } from '@/lib/houseData';

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: BenchmarkList,
});

const testRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'benchmark/$testId',
  // Only live benchmarks have a page; anything else falls back home.
  beforeLoad: ({ params }) => {
    const test = TEST_META[params.testId as TestKey];
    if (!test || test.status !== 'live') {
      throw redirect({ to: '/' });
    }
  },
  component: TestPage,
});

const routeTree = rootRoute.addChildren([indexRoute, testRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
