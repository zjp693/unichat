import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useToast } from '@/hooks/use-toast';
import { parseQRCode } from '@/lib/qrcode';

export function useScanQR() {
  const router = useRouter();
  const { toast } = useToast();

  // 状态管理
  const [isScanning, setIsScanning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理扫码结果（使用 functional 更新确保计数准确）
  const handleScanSuccess = (decodedText: string) => {
    if (isProcessing) return;
    if (navigator.vibrate) navigator.vibrate(50);
    stopScanning();

    setTotalAttempts((prev) => {
      const newCount = prev + 1;
      try {
        const data = parseQRCode(decodedText);
        if (data.type === 'user' && data.address) {
          toast({
            title: `扫描成功 (${newCount} 次)`,
            description: `已识别用户地址 ${data.address}`,
            variant: 'default'
          });
          router.push(`/contacts/profile/${data.address}`);
        } else {
          throw new Error('无效的二维码类型');
        }
      } catch (err) {
        toast({
          title: `识别失败 (${newCount} 次)`,
          description: '请扫描有效的 UniChat 用户二维码',
          variant: 'destructive'
        });
        setTimeout(() => startScanning(), 1000);
      }
      return newCount;
    });
  };

  // 启动扫描并处理权限错误
  const startScanning = async () => {
    if (scannerRef.current?.isScanning) return;
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader', {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        });
      }
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const boxSize = Math.floor(minEdge * 0.7);
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0
        },
        handleScanSuccess,
        () => {}
      );
      setIsScanning(true);
      checkTorchCapability();
      setError(null);
    } catch (err: any) {
      console.error('扫码启动失败:', err);
      if (err.name === 'NotAllowedError') {
        setError('请授权摄像头访问权限');
      } else if (err.name === 'NotFoundError') {
        setError('未检测到摄像头设备');
      } else {
        setError('摄像头启动失败，请稍后重试');
      }
    }
  };

  // 停止扫描
  const stopScanning = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
        setIsTorchOn(false);
      }
    } catch (err) {
      console.error('停止扫描失败:', err);
    }
  };

  // 真实检测手电筒能力（使用 getUserMedia）
  const checkTorchCapability = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities &&
        track.getCapabilities()) as any;
      setHasTorch(!!capabilities?.torch);
      track.stop();
    } catch {
      setHasTorch(false);
    }
  };

  // 切换手电筒
  const toggleTorch = async () => {
    // 检查设备是否支持手电筒
    if (!hasTorch) {
      toast({
        description: '当前设备不支持手电筒功能',
        variant: 'destructive'
      });
      return;
    }

    if (!scannerRef.current || !isScanning) return;

    try {
      await scannerRef.current.applyVideoConstraints({
        // @ts-ignore – torch not in standard lib yet
        advanced: [{ torch: !isTorchOn }]
      });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      console.error('切换手电筒失败:', err);
      toast({ description: '无法操作手电筒', variant: 'destructive' });
    }
  };

  // 处理相册选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const html5QrCode = new Html5Qrcode('reader-hidden');
      const result = await html5QrCode.scanFile(file, true);
      handleScanSuccess(result);
      html5QrCode.clear();
    } catch {
      toast({
        title: '识别失败',
        description: '未在图片中发现二维码',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 初始化扫描器
  useEffect(() => {
    const timer = setTimeout(() => startScanning(), 500);
    return () => {
      clearTimeout(timer);
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isScanning,
    hasTorch,
    isTorchOn,
    isProcessing,
    error,
    fileInputRef,
    startScanning,
    toggleTorch,
    handleFileSelect
  };
}
