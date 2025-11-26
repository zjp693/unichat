'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { RedPacketConfig } from './types';

interface OpenRedPacketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDetails?: () => void;
  senderName: string;
  senderAvatar?: string;
  message: string;
  status: 'active' | 'claimed' | 'expired' | 'empty';
}

export function OpenRedPacketModalNew({
  isOpen,
  onClose,
  onOpen,
  onDetails,
  senderName,
  senderAvatar,
  message,
  status
}: OpenRedPacketModalProps) {
  const [isOpening, setIsOpening] = React.useState(false);

  // Debug log to confirm new version is loaded
  React.useEffect(() => {
    console.log('OpenRedPacketModalNew V3 loaded');
  }, []);

  const handleOpenClick = () => {
    setIsOpening(true);
    // Animation duration 0.5s
    setTimeout(() => {
      onOpen();
      setIsOpening(false);
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-transparent border-none shadow-none p-0 w-full max-w-[320px] flex flex-col items-center gap-6 [&>button]:hidden">
        <DialogTitle className="sr-only">Open Red Packet</DialogTitle>
        <DialogDescription className="sr-only">
          Open Red Packet
        </DialogDescription>

        {/* Red Packet Container - Responsive with vw/vh */}
        <div className="relative w-[75vw] max-w-[320px] h-[125vw] max-h-[650px] overflow-hidden shrink-0">
          {/* Top Section */}
          <div
            className={cn(
              'absolute top-0 left-0 right-0 h-[70%] z-10 transition-transform duration-700 ease-in-out',
              isOpening && '-translate-y-[140%]'
            )}
          >
            <Image
              src="/chats/red_top.png"
              alt="Top"
              fill
              className="object-fill"
              priority
            />

            {/* Content Layer */}
            <div className="absolute inset-0 flex flex-col items-center pt-[25%] z-20">
              {/* Sender Info */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[#fcedae]">
                  <div className="w-6 h-6 rounded-sm overflow-hidden relative bg-black/20">
                    {senderAvatar ? (
                      <Image
                        src={senderAvatar}
                        alt={senderName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 flex items-center justify-center text-xs text-gray-500">
                        {senderName?.[0]}
                      </div>
                    )}
                  </div>
                  <span className="text-[15px] font-medium text-[#fcedae]">
                    {senderName}的红包
                  </span>
                </div>

                {/* Message or Empty Status Text */}
                {status === 'empty' ? (
                  <div className="text-[#fcedae] text-[24px] font-medium tracking-wide px-4 text-center mt-2">
                    手慢了，红包派完了
                  </div>
                ) : (
                  <div className="text-[#fcedae] text-[20px] font-medium tracking-wide px-4 text-center">
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div
            className={cn(
              'absolute bottom-[14%] left-0 right-0 h-[30%] z-[9] transition-transform duration-700 ease-in-out',
              isOpening && 'translate-y-[200%]'
            )}
          >
            <Image
              src="/chats/red_bottom.png"
              alt="Bottom"
              fill
              className="object-fill"
              priority
            />
          </div>

          {/* Check Luck Link (Only for empty status) - Positioned in main container */}
          {status === 'empty' && (
            <div className="absolute bottom-[16%] w-full flex justify-center z-30">
              <button
                onClick={onDetails}
                className="text-[#fcedae] text-sm flex items-center gap-1 hover:text-white transition-colors font-medium"
              >
                看看大家的手气 &gt;
              </button>
            </div>
          )}

          {/* Open Button / Status Text */}
          <div
            className={cn(
              'absolute top-[68%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-500',
              isOpening && 'opacity-0 scale-0'
            )}
          >
            {status === 'active' ? (
              <button
                onClick={handleOpenClick}
                disabled={isOpening}
                className={cn(
                  'w-[25vw] h-[25vw] max-w-[100px] max-h-[100px] rounded-full flex items-center justify-center transition-transform active:scale-95',
                  isOpening && 'animate-rotate-y'
                )}
              >
                <Image
                  src="/chats/open.png"
                  alt="Open"
                  width={100}
                  height={100}
                  className="object-contain"
                />
              </button>
            ) : status ===
              'empty' ? // Empty status doesn't show a button or "claimed" text here, it shows text in top section and link at bottom
            null : (
              <div className="text-[#fcedae] text-lg font-medium whitespace-nowrap bg-black/10 px-4 py-1 rounded-full">
                {status === 'claimed' ? '已领取' : '已过期'}
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full border border-white/50 flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
