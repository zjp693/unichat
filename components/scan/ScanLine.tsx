interface ScanLineProps {
  isScanning: boolean;
}

export function ScanLine({ isScanning }: ScanLineProps) {
  if (!isScanning) return null;

  return (
    <>
      {/* 扫描动画线 */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent shadow-[0_0_20px_#8B5CF6] animate-scan-line z-10" />

      {/* 动画定义 */}
      <style jsx global>{`
        @keyframes scan-line {
          0% {
            top: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }
        .animate-scan-line {
          animation: scan-line 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </>
  );
}
