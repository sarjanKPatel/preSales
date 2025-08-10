import { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import AppLayout from '@/components/layout/AppLayout';
import "./globals.css";

export const metadata: Metadata = {
  title: "PropelIQ - AI-Powered Pre-Sales Proposals",
  description: "Transform your sales process with intelligent proposal generation powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <WorkspaceProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </WorkspaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
