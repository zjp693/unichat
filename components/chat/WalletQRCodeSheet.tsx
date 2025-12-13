'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import Image from 'next/image';

import { generateUserQRCode } from '@/lib/qrcode';

interface WalletQRCodeSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletQRCodeSheet({ isOpen, onClose }: WalletQRCodeSheetProps) {
  const { address } = useAccount();
  const { toast } = useToast();

  // 生成二维码内容
  const qrCodeValue = address ? generateUserQRCode(address) : '';

  // 复制钱包地址
  const handleCopyAddress = async () => {
    if (!address) {
      toast({
        title: '未连接钱包',
        description: '请先连接您的钱包',
        variant: 'destructive'
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: '复制成功',
        description: '钱包地址已复制到剪贴板',
        variant: 'success'
      });
    } catch (err) {
      console.error('复制失败:', err);
      toast({
        title: '复制失败',
        description: '无法复制地址',
        variant: 'destructive'
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-6 pb-8 pt-6 bg-white"
        showCloseButton={false}
      >
        {/* 顶部拖拽指示条 */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <SheetHeader className="mb-6">
          <SheetTitle className="text-center text-base font-medium text-gray-800">
            扫一扫，给我发送加密信息吧
          </SheetTitle>
        </SheetHeader>

        {/* 二维码区域 */}
        <div className="flex justify-center mb-6">
          <div className="relative p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            {address ? (
              <>
                <QRCodeSVG
                  value={qrCodeValue}
                  size={200}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
                {/* 中心Logo */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-lg p-1 shadow-sm border border-gray-100">
                  <Image
                    src="/shop/logo.png"
                    alt="UniChat"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // 如果logo不存在，隐藏
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
                请先连接钱包
              </div>
            )}
          </div>
        </div>

        {/* 钱包地址 */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-500 mb-1">钱包地址</p>
          <p className="text-sm text-gray-700 font-mono break-all px-4 leading-relaxed">
            {address || '未连接'}
          </p>
        </div>

        {/* 复制按钮 */}
        <Button
          variant="ghost"
          className="w-full h-12 text-base font-medium text-gray-700 rounded-md bg-[rgba(239,235,254,0.5)]"
          onClick={handleCopyAddress}
          disabled={!address}
        >
          复制钱包地址
        </Button>
      </SheetContent>
    </Sheet>
  );
}
