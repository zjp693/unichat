'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 z-1 w-full border-t bg-background px-2 py-2">
      <div className="flex justify-around">
        <NavItem
          href="/"
          icon={
            pathname === '/' ? (
              <Image
                src="/bottom/chat-active.png"
                alt="chat"
                width={25}
                height={25}
              />
            ) : (
              <Image src="/bottom/chat.png" alt="chat" width={25} height={25} />
            )
          }
          label="Chats"
          active={pathname === '/'}
          badgeCount={10}
        />
        <NavItem
          href="/contacts"
          icon={
            pathname === '/contacts' ? (
              <Image
                src="/bottom/contacts-active.png"
                alt="contacts"
                width={25}
                height={25}
              />
            ) : (
              <Image
                src="/bottom/contacts.png"
                alt="contacts"
                width={25}
                height={25}
              />
            )
          }
          label="Contacts"
          active={pathname === '/contacts'}
        />
        <NavItem
          href="/discover"
          icon={
            pathname === '/discover' ? (
              <Image
                src="/bottom/discover-active.png"
                alt="discover"
                width={25}
                height={25}
              />
            ) : (
              <Image
                src="/bottom/discover.png"
                alt="discover"
                width={25}
                height={25}
              />
            )
          }
          label="Discover"
          active={pathname === '/discover'}
        />
        <NavItem
          href="/me"
          icon={
            pathname === '/me' ? (
              <Image
                src="/bottom/me-active.png"
                alt="me"
                width={25}
                height={25}
              />
            ) : (
              <Image src="/bottom/me.png" alt="me" width={25} height={25} />
            )
          }
          label="Me"
          active={pathname === '/me'}
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  badgeCount
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex flex-col items-center justify-center px-2 py-1 text-xs relative',
        {
          'text-[rgba(86,55,245,1)] font-bold': active,
          'text-muted-foreground': !active
        }
      )}
    >
      <div className="relative">
        {icon}
        {badgeCount && (
          <Badge
            variant="destructive"
            className="absolute top-[-4px] right-[-8px] h-4 min-w-[16px] text-[10px] flex items-center justify-center"
          >
            {badgeCount > 9 ? '···' : badgeCount}
          </Badge>
        )}
      </div>
      <span
        className={`mt-1 ${active ? 'font-bold text-[rgba(86,55,245,1)]' : ''}`}
      >
        {label}
      </span>
    </Link>
  );
}
