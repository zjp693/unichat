'use client';

import React from 'react';

interface MessageSendModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'plaintext' | 'encrypted') => void;
}

export function MessageSendModeModal({
  isOpen,
  onClose,
  onSelectMode
}: MessageSendModeModalProps) {
  const handleSelectPlaintext = () => {
    onSelectMode('plaintext');
    onClose(); // 选择后关闭弹窗
  };

  const handleSelectEncrypted = () => {
    onSelectMode('encrypted');
    onClose(); // 选择后关闭弹窗
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 底部弹出的选项卡 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-2xl shadow-2xl">
          {/* 选项列表 */}
          <div className="pt-4 pb-2">
            {/* 密文发送按钮 */}
            <button
              onClick={handleSelectEncrypted}
              className="w-full h-14 text-base font-medium text-gray-700 bg-white transition-all duration-150 mb-3 border-b border-slate-300"
            >
              密文发送
            </button>

            {/* 明文发送按钮 */}
            <button
              onClick={handleSelectPlaintext}
              className="w-full h-14 text-base font-medium text-gray-700 bg-white transition-all duration-150"
            >
              明文发送
            </button>
          </div>

          {/* 分隔线 */}
          <div className="h-2 bg-gray-100" />

          {/* 取消按钮 */}
          <div className="py-2 pb-safe">
            <button
              onClick={onClose}
              className="w-full h-14 text-base font-medium text-gray-700 bg-white transition-all duration-150"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
