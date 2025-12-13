'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { parseQRCode } from '@/lib/qrcode';
import { PageHeader } from '@/components/ui/page-header';

export default function ScanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 处理扫码结果
  const handleScanSuccess = (decodedText: string) => {
    // 停止扫码
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }

    // 解析二维码
    const data = parseQRCode(decodedText);

    switch (data.type) {
      case 'user':
        if (data.address) {
          router.push(`/contacts/profile/${data.address}`);
        }
        break;
      default:
        toast({
          title: '无法识别的二维码',
          description: '请扫描有效的 UniChat 二维码',
          variant: 'destructive'
        });
        // 重新开始扫码
        startScanning();
    }
  };

  // 开始扫码
  const startScanning = async () => {
    if (!containerRef.current || scannerRef.current?.isScanning) return;

    try {
      setError(null);
      setIsScanning(true);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' }, // 后置摄像头
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        handleScanSuccess,
        () => {} // 忽略扫描中的错误
      );
    } catch (err: any) {
      console.error('扫码启动失败:', err);
      setIsScanning(false);

      if (err.name === 'NotAllowedError') {
        setError('请允许访问摄像头权限');
      } else if (err.name === 'NotFoundError') {
        setError('未找到摄像头设备');
      } else {
        setError('无法启动摄像头');
      }
    }
  };

  // 停止扫码
  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('停止扫码失败:', err);
      }
    }
    setIsScanning(false);
  };

  // 组件挂载时启动扫码
  useEffect(() => {
    // 延迟启动，确保 DOM 已渲染
    const timer = setTimeout(() => {
      startScanning();
    }, 500);

    return () => {
      clearTimeout(timer);
      stopScanning();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* 顶部导航 */}
      <PageHeader
        title="扫一扫"
        className="bg-black/50 text-white border-none"
      />

      {/* 扫码区域 */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* 扫码框 */}
        <div
          id="qr-reader"
          ref={containerRef}
          className="w-full max-w-[300px] aspect-square"
        />

        {/* 提示文字 */}
        <p className="text-white/70 text-sm mt-6">
          将二维码放入框内，即可自动扫描
        </p>

        {/* 错误提示 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
            <p className="text-white text-center mb-4">{error}</p>
            <button
              onClick={startScanning}
              className="px-6 py-2 bg-white text-black rounded-lg"
            >
              重试
            </button>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="p-6 text-center">
        <p className="text-white/50 text-xs">
          扫描 UniChat 用户二维码可快速添加联系人
        </p>
      </div>
    </div>
  );
}
