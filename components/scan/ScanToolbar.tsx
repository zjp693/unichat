import { Image as ImageIcon, Flashlight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanToolbarProps {
  isProcessing: boolean;
  hasTorch: boolean;
  isTorchOn: boolean;
  onAlbumClick: () => void;
  onTorchClick: () => void;
}

export function ScanToolbar({
  isProcessing,
  hasTorch,
  isTorchOn,
  onAlbumClick,
  onTorchClick
}: ScanToolbarProps) {
  return (
    <div className="absolute bottom-20 flex items-center gap-16">
      {/* 相册按钮 */}
      <button
        onClick={onAlbumClick}
        className="flex flex-col items-center gap-2 group transition-all active:scale-95"
        aria-label="从相册选择二维码"
      >
        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center group-hover:bg-white/20 transition-colors border border-white/10">
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          ) : (
            <ImageIcon className="w-6 h-6 text-white" />
          )}
        </div>
        <span className="text-xs text-white/80 font-medium">相册</span>
      </button>

      {/* 手电筒按钮 */}
      <button
        onClick={onTorchClick}
        className="flex flex-col items-center gap-2 group transition-all active:scale-95"
        aria-label={isTorchOn ? '关闭手电筒' : '打开手电筒'}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center transition-all border border-white/10',
            isTorchOn
              ? 'bg-white/90 text-[#8B5CF6] shadow-[0_0_20px_rgba(255,255,255,0.4)]'
              : hasTorch
                ? 'group-hover:bg-white/20 text-white'
                : 'opacity-50 text-white/50'
          )}
        >
          <Flashlight
            className={cn('w-6 h-6', isTorchOn ? 'fill-current' : '')}
          />
        </div>
        <span className="text-xs text-white/80 font-medium">
          {isTorchOn ? '轻触关闭' : '轻触照亮'}
        </span>
      </button>
    </div>
  );
}
