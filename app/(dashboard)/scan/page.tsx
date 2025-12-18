'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ScanBox } from '@/components/scan/ScanBox';
import { ScanToolbar } from '@/components/scan/ScanToolbar';
import { ScanErrorOverlay } from '@/components/scan/ScanErrorOverlay';
import { useScanQR } from '@/hooks/useScanQR';

export default function ScanPage() {
  const {
    isScanning,
    hasTorch,
    isTorchOn,
    isProcessing,
    error,
    fileInputRef,
    startScanning,
    toggleTorch,
    handleFileSelect
  } = useScanQR();

  return (
    <div className="flex flex-col min-h-screen bg-black text-white relative overflow-hidden">
      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
        aria-label="选择二维码图片"
      />
      <div id="reader-hidden" className="hidden" />

      {/* 顶部导航 */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <PageHeader
          title="扫一扫"
          className="bg-black/20 backdrop-blur-sm border-none text-white [&_button]:text-white"
        />
      </div>

      {/* 相机预览层 */}
      <div className="absolute inset-0 z-0">
        <div
          id="qr-reader"
          className="w-full h-full object-cover [&_video]:object-cover [&_video]:h-full [&_video]:w-full"
        />
      </div>

      {/* 遮罩层 UI */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* 遮罩 */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />

        {/* 扫描框 */}
        <ScanBox isScanning={isScanning} />

        {/* 提示文字 */}
        <p className="mt-8 text-white/80 text-sm font-medium tracking-wide drop-shadow-md">
          {isProcessing ? '正在识别图片...' : '将二维码放入框内，即可自动扫描'}
        </p>

        {/* 工具栏 */}
        <ScanToolbar
          isProcessing={isProcessing}
          hasTorch={hasTorch}
          isTorchOn={isTorchOn}
          onAlbumClick={() => fileInputRef.current?.click()}
          onTorchClick={toggleTorch}
        />

        {/* 错误遮罩 */}
        <ScanErrorOverlay error={error} onRetry={startScanning} />
      </div>
    </div>
  );
}
