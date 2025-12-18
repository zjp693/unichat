import { ScanCorners } from './ScanCorners';
import { ScanLine } from './ScanLine';

interface ScanBoxProps {
  isScanning: boolean;
}

export function ScanBox({ isScanning }: ScanBoxProps) {
  return (
    <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
      {/* 四角装饰 */}
      <ScanCorners />

      {/* 扫描动画线 */}
      <ScanLine isScanning={isScanning} />

      {/* 内部微光边框 */}
      <div className="absolute inset-0 border border-white/20 rounded-lg" />
    </div>
  );
}
