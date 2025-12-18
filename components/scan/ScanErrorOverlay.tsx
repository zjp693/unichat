interface ScanErrorOverlayProps {
  error: string | null;
  onRetry: () => void;
}

export function ScanErrorOverlay({ error, onRetry }: ScanErrorOverlayProps) {
  if (!error) return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <p className="text-white text-center mb-4" aria-live="assertive">
        {error}
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-white text-black rounded-lg"
      >
        重试
      </button>
    </div>
  );
}
