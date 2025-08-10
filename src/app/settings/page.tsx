'use client';

import SettingsPage from '@/components/pages/Settings';

// Disable static optimization to prevent SSR issues with auth
export const dynamic = 'force-dynamic';

export default function Page() {
  return <SettingsPage />;
}