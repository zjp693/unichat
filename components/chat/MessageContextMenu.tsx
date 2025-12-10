'use client';

import { Copy } from 'lucide-react';

interface MessageContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onCopy: () => void;
  onClose: () => void;
}

export function MessageContextMenu({
  isOpen,
  position,
  onCopy,
  onClose
}: MessageContextMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* 浮动菜单 */}
      <div
        className="fixed z-50 bg-[#1a1a1a] text-white rounded-lg shadow-2xl py-2 px-3 flex items-center gap-2 min-w-[80px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y - 50}px`,
          transform: 'translateX(-50%)'
        }}
      >
        <button
          className="flex items-center gap-1.5 text-sm hover:opacity-80 transition-opacity"
          onClick={onCopy}
        >
          <Copy size={14} />
          <span>复制</span>
        </button>
      </div>
    </>
  );
}
