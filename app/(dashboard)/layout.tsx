import { Analytics } from '@vercel/analytics/react';
import Providers from './providers';
import { BottomNav } from './bottom-nav';
import { ConditionalBottomNav } from './conditional-bottom-nav';
import { ConditionalContainer } from './conditional-container';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <main className="flex min-h-screen w-full flex-col bg-background">
        <ConditionalContainer>
          <main className="flex-1 overflow-hidden">{children}</main>
        </ConditionalContainer>
        <ConditionalBottomNav />
        <Analytics />
      </main>
    </Providers>
  );
}
