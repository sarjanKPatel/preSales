'use client';

import nextDynamic from 'next/dynamic';

// Disable static optimization to prevent SSR issues with auth
export const dynamic = 'force-dynamic';

const ProposalDetailPage = nextDynamic(() => import('@/components/pages/ProposalDetail'), {
  ssr: false,
});

export default function Page() {
  return <ProposalDetailPage />;
}