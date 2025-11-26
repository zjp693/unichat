'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface Action {
  label: string;
  onClick: () => void;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Action[];
  cancelText?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  actions,
  cancelText = '取消'
}: ActionSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#f7f7f7] rounded-t-[14px] overflow-hidden">
          <div className="bg-white">
            {actions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  'w-full h-[56px] flex items-center justify-center text-[17px] text-[#1a1a1a] font-normal active:bg-gray-50',
                  index !== actions.length - 1 && 'border-b border-gray-100'
                )}
                onClick={() => {
                  action.onClick();
                  // We don't auto-close here to allow for custom logic,
                  // but usually the parent will close it or the action will.
                  // Actually, for a pure selection sheet, it usually closes.
                  // But let's leave it to the parent to close via the action callback if needed,
                  // or we can wrap it.
                  // The user's current implementation closes it in the handler.
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          <div className="h-2 bg-[#f7f7f7]"></div>

          <button
            className="w-full h-[56px] bg-white flex items-center justify-center text-[17px] text-[#1a1a1a] font-normal active:bg-gray-50 pb-safe-offset-0"
            onClick={onClose}
          >
            {cancelText}
          </button>
          {/* Safe area spacer */}
          <div className="h-safe bg-white"></div>
        </div>
      </div>
    </div>
  );
}
