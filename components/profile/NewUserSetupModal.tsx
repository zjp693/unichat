'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWaitForTransactionReceipt } from 'wagmi';
import {
  uploadImageToPinata,
  uploadMetadataToPinata,
  createNFTMetadata
} from '@/lib/pinata-upload';
import {
  useUniChatProfileWrite,
  buildMintProfileArgs,
  useDefaultAvatarCid,
  useProfileAddress
} from '@/lib/UniChatProfileAbi';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { useCheckBalance } from '@/hooks/useCheckBalance';
import UniChatProfileABI from '@/contract/abi/UniChatProfile.json';

interface NewUserSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewUserSetupModal({
  isOpen,
  onClose,
  onSuccess
}: NewUserSetupModalProps) {
  const { toast } = useToast();
  const { writeContractAsync } = useUniChatProfileWrite();
  const { data: defaultAvatarCid } = useDefaultAvatarCid();
  const profileAddress = useProfileAddress();
  const { checkNativeBalance } = useCheckBalance();

  useEffect(() => {
    console.log('👀 [Debug] Contract Default Avatar CID:', defaultAvatarCid);
  }, [defaultAvatarCid]);

  const [step, setStep] = useState<'input' | 'uploading' | 'minting'>('input');
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [useDefaultAvatar, setUseDefaultAvatar] = useState(true);

  // 交易确认状态
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // 等待交易确认
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash
  });

  // 获取默认头像 CID
  const defaultAvatarCidStr = defaultAvatarCid
    ? (defaultAvatarCid as string)
    : '';

  // 监听交易确认
  useEffect(() => {
    if (isConfirmed) {
      toast({
        title: '设置成功！',
        description: '您的 NTF头像 已创建',
        variant: 'success'
      });

      onSuccess();
      onClose();

      // // 刷新页面以显示最新数据
      // setTimeout(() => {
      //   window.location.reload();
      // }, 500);
    }
  }, [isConfirmed, toast, onSuccess, onClose]);

  // 处理头像选择（直接上传，不裁剪）
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: '文件类型错误',
          description: '请选择图片文件',
          variant: 'destructive'
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: '文件过大',
          description: '图片大小不能超过 5MB',
          variant: 'destructive'
        });
        return;
      }

      // 直接设置文件和预览
      setAvatarFile(file);
      setUseDefaultAvatar(false);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: '请输入昵称',
        variant: 'destructive'
      });
      return;
    }

    const nameBytes = new TextEncoder().encode(name).length;
    if (nameBytes < 1 || nameBytes > 64) {
      toast({
        title: '昵称长度错误',
        description: '昵称长度必须在 1-64 字节之间',
        variant: 'destructive'
      });
      return;
    }

    if (!useDefaultAvatar && !avatarFile) {
      toast({
        title: '请选择头像',
        variant: 'destructive'
      });
      return;
    }

    // 💰 余额检查
    if (!profileAddress) {
      toast({
        title: '合约地址未找到',
        description: '请稍后重试',
        variant: 'destructive'
      });
      return;
    }

    // 根据是否使用默认头像,准备合适的估算参数
    const tempAvatarCid = useDefaultAvatar
      ? ''
      : 'QmTemporaryHashForGasEstimation1234567890123456789012'; // 临时假CID用于估算

    const balanceCheck = await checkNativeBalance(
      profileAddress,
      UniChatProfileABI.abi as any,
      'mintProfile',
      [
        name,
        '', // description
        useDefaultAvatar,
        tempAvatarCid, // 使用合适的临时值
        'ipfs://temp' // tokenUri (临时值)
      ]
    );

    if (!balanceCheck.success) {
      toast({
        title: '余额不足',
        description: balanceCheck.message,
        variant: 'destructive'
      });
      return;
    }

    try {
      setStep('uploading');

      let avatarCid = '';

      if (!useDefaultAvatar && avatarFile) {
        toast({
          title: '上传头像中...',
          description: '正在上传到 IPFS'
        });
        avatarCid = await uploadImageToPinata(avatarFile);
        console.log('头像 CID:', avatarCid);
      }

      toast({
        title: '创建 metadata...',
        description: '正在生成 NFT 元数据'
      });

      // 确定最终使用的头像 CID
      const finalAvatarCid = useDefaultAvatar
        ? (defaultAvatarCid as string) || ''
        : avatarCid;

      const metadata = createNFTMetadata(name, '', finalAvatarCid);
      const metadataCid = await uploadMetadataToPinata(metadata);
      const tokenUri = `ipfs://${metadataCid}`;
      console.log('Metadata CID:', metadataCid);
      console.log('使用的头像 CID:', finalAvatarCid);

      setStep('minting');
      toast({
        title: '铸造 Profile NFT...',
        description: '请在钱包中确认交易'
      });

      const hash = await writeContractAsync(
        buildMintProfileArgs(
          name,
          '', // 简介为空
          useDefaultAvatar,
          useDefaultAvatar ? '' : avatarCid,
          tokenUri,
          profileAddress // 🔧 传入当前链的合约地址
        )
      );

      console.log('交易哈希:', hash);

      setTxHash(hash);

      toast({
        title: '交易已提交',
        description: '等待区块确认...'
      });
    } catch (error: any) {
      console.error('创建 Profile 失败:', error);
      toast({
        title: '创建失败',
        description: error.message || '请重试',
        variant: 'destructive'
      });
      setStep('input');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              欢迎来到 UniChat
            </h2>
            {step === 'input' && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {step === 'input' && (
              <>
                <p className="text-sm text-gray-600">
                  请设置您的个人资料，这将作为您的链上身份卡
                </p>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    头像
                  </label>
                  <div className="flex justify-center">
                    <label className="cursor-pointer">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center hover:opacity-80 transition-opacity">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <IPFSImg
                            src={defaultAvatarCidStr}
                            fallbackSrc="/me/default.jpg"
                            alt="Default avatar"
                            className="w-full h-full object-cover"
                            enableLogging={false}
                            maxRetries={5}
                          />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    昵称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const value = e.target.value;
                      const bytes = new TextEncoder().encode(value).length;
                      // 如果超过64字节，截断到64字节
                      if (bytes > 64) {
                        let truncated = value;
                        while (
                          new TextEncoder().encode(truncated).length > 64
                        ) {
                          truncated = truncated.slice(0, -1);
                        }
                        setName(truncated);
                      } else {
                        setName(value);
                      }
                    }}
                    placeholder="请输入昵称"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {(step === 'uploading' || step === 'minting') && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-600">
                  {step === 'uploading' && '正在上传到 IPFS...'}
                  {step === 'minting' && '正在铸造 Profile NFT...'}
                </p>
              </div>
            )}
          </div>

          {step === 'input' && (
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
              >
                确定
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
