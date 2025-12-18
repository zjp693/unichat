export function ScanCorners() {
  return (
    <>
      {/* 四角装饰 - 左上 */}
      <div className="absolute top-0 left-0">
        <div className="w-12 h-[3px] bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
        <div className="w-[3px] h-12 bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
      </div>

      {/* 四角装饰 - 右上 */}
      <div className="absolute top-0 right-0 flex flex-col items-end">
        <div className="w-12 h-[3px] bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
        <div className="w-[3px] h-12 bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
      </div>

      {/* 四角装饰 - 左下 */}
      <div className="absolute bottom-0 left-0 flex flex-col">
        <div className="w-[3px] h-12 bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
        <div className="w-12 h-[3px] bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
      </div>

      {/* 四角装饰 - 右下 */}
      <div className="absolute bottom-0 right-0 flex flex-col items-end">
        <div className="w-[3px] h-12 bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
        <div className="w-12 h-[3px] bg-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.9)]" />
      </div>
    </>
  );
}
