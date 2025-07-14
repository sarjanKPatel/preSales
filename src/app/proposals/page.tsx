'use client';

import nextDynamic from 'next/dynamic';

// Disable static optimization to prevent SSR issues with auth
export const dynamic = 'force-dynamic';

const ProposalsPage = nextDynamic(() => import('@/components/pages/Proposals'), {
  ssr: false,
});

export default function Page() {
  return <ProposalsPage />;
}