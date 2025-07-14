'use client';

import nextDynamic from 'next/dynamic';

// Disable static optimization to prevent SSR issues with auth
export const dynamic = 'force-dynamic';

const HomePage = nextDynamic(() => import('@/components/pages/Home'), {
  ssr: false,
});

export default function Page() {
  return <HomePage />;
}
