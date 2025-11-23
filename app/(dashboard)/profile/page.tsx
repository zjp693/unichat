'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TopNavbar } from '@/components/ui/top-navbar';
import { ChevronLeft, ChevronRight, QrCode, Check, X } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useUserProfiles, useProfile } from '@/hooks/useProfileCheck';
import {
  useUniChatProfileWrite,
  buildUpdateProfileArgs
} from '@/lib/UniChatProfileAbi';
import { IPFSImg } from '@/components/ui/ipfs-img';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { address } = useAccount();
  const { tokenIds } = useUserProfiles();
  const { writeContractAsync } = useUniChatProfileWrite();

  // 获取第一个 Profile（主 Profile）
  const firstTokenId =
    tokenIds && tokenIds.length > 0 ? tokenIds[0] : undefined;
  const {
    profile,
    isLoading: isLoadingProfile,
    refetch
  } = useProfile(firstTokenId);

  // 从 profile 中提取数据
  const profileData = profile as any;
  const userName = profileData?.name || '未设置';
  const avatarCid = profileData?.avatarCid || '';

  // 昵称编辑状态
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [updateType, setUpdateType] = useState<'name' | 'avatar' | null>(null);

  // 头像编辑状态
  const [showAvatarOptionsModal, setShowAvatarOptionsModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 等待交易确认（使用轮询模式，避免 WebSocket 订阅问题）
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash,
      pollingInterval: 1000 // 每秒轮询一次，不使用 WebSocket
    });

  // 当 profile 加载完成时，初始化编辑的昵称
  useEffect(() => {
    if (profileData?.name) {
      setEditedName(profileData.name);
    }
  }, [profileData?.name]);

  // 监听交易确认
  useEffect(() => {
    if (isConfirmed) {
      const message = updateType === 'avatar' ? '头像已更新' : '昵称已更新';

      toast({
        title: '更新成功！',
        description: message,
        variant: 'success'
      });

      setIsEditingName(false);
      setIsSaving(false);
      setIsUploadingAvatar(false);
      setTxHash(undefined);
      setUpdateType(null);

      // 等待一下让区块链数据更新，然后重新获取 profile 数据
      setTimeout(() => {
        refetch();
      }, 1000);
    }
  }, [isConfirmed, updateType, toast, refetch]);

  // 保存昵称
  const handleSaveName = async () => {
    if (!editedName.trim()) {
      toast({
        title: '昵称不能为空',
        variant: 'destructive'
      });
      return;
    }

    const nameBytes = new TextEncoder().encode(editedName).length;
    if (nameBytes < 1 || nameBytes > 64) {
      toast({
        title: '昵称长度错误',
        description: '昵称长度必须在 1-64 字节之间',
        variant: 'destructive'
      });
      return;
    }

    if (!firstTokenId) {
      toast({
        title: '未找到 Profile',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      setUpdateType('name');

      toast({
        title: '提交交易中...',
        description: '请在钱包中确认'
      });

      // 调用合约更新 Profile
      const hash = await writeContractAsync(
        buildUpdateProfileArgs(
          firstTokenId,
          editedName, // 新昵称
          '', // 不更新简介
          '', // 不更新头像
          '' // 不更新 tokenUri
        )
      );

      setTxHash(hash);

      toast({
        title: '交易已提交',
        description: '等待区块确认...'
      });
    } catch (error: any) {
      console.error('更新昵称失败:', error);

      // 检查是否是用户拒绝交易
      if (
        error.message?.includes('User rejected') ||
        error.message?.includes('user rejected')
      ) {
        toast({
          title: '已取消',
          description: '您已取消交易'
        });
      } else {
        toast({
          title: '更新失败',
          description: error.message || '请重试',
          variant: 'destructive'
        });
      }

      // 恢复原值并退出编辑模式
      handleCancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditedName(profileData?.name || '');
    setIsEditingName(false);
  };

  // 处理头像选择
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

      setAvatarFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 保存头像
  const handleSaveAvatar = async () => {
    if (!avatarFile) {
      toast({
        title: '请选择头像',
        variant: 'destructive'
      });
      return;
    }

    if (!firstTokenId) {
      toast({
        title: '未找到 Profile',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setUpdateType('avatar');

      toast({
        title: '上传头像中...',
        description: '正在上传到 IPFS'
      });

      // 动态导入 uploadImageToPinata
      const { uploadImageToPinata } = await import('@/lib/pinata-upload');
      const avatarCid = await uploadImageToPinata(avatarFile);

      toast({
        title: '提交交易中...',
        description: '请在钱包中确认'
      });

      // 调用合约更新头像
      const hash = await writeContractAsync(
        buildUpdateProfileArgs(
          firstTokenId,
          '', // 不更新昵称
          '', // 不更新简介
          avatarCid, // 新头像 CID
          '' // 不更新 tokenUri
        )
      );

      setTxHash(hash);

      toast({
        title: '交易已提交',
        description: '等待区块确认...'
      });

      setShowAvatarModal(false);
      setAvatarFile(null);
      setAvatarPreview('');
    } catch (error: any) {
      console.error('更新头像失败:', error);

      if (
        error.message?.includes('User rejected') ||
        error.message?.includes('user rejected')
      ) {
        toast({
          title: '已取消',
          description: '您已取消交易'
        });
      } else {
        toast({
          title: '更新失败',
          description: error.message || '请重试',
          variant: 'destructive'
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 使用默认头像
  const handleUseDefaultAvatar = async () => {
    if (!firstTokenId) {
      toast({
        title: '未找到 Profile',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);

      toast({
        title: '提交交易中...',
        description: '请在钱包中确认'
      });

      // 调用合约的 useDefaultAvatar 函数
      const { buildUseDefaultAvatarArgs } = await import(
        '@/lib/UniChatProfileAbi'
      );

      const hash = await writeContractAsync(
        buildUseDefaultAvatarArgs(firstTokenId)
      );

      setTxHash(hash);

      toast({
        title: '交易已提交',
        description: '等待区块确认...'
      });

      setShowAvatarModal(false);
    } catch (error: any) {
      console.error('使用默认头像失败:', error);

      if (
        error.message?.includes('User rejected') ||
        error.message?.includes('user rejected')
      ) {
        toast({
          title: '已取消',
          description: '您已取消交易'
        });
      } else {
        toast({
          title: '更新失败',
          description: error.message || '请重试',
          variant: 'destructive'
        });
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 复制地址
  const copyAddress = async () => {
    if (!address) return;

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <TopNavbar />

      {/* 标题栏 */}
      <div className="flex items-center justify-center relative py-4 px-4 bg-white border-b border-gray-200">
        <button
          className="absolute left-4 hover:bg-gray-100 rounded-full p-1 transition-colors"
          onClick={() => router.back()}
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="text-base font-medium text-gray-900">个人资料</h1>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {/* NFT头像 */}
        <div
          className="bg-white border-b border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => setShowAvatarOptionsModal(true)}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">NFT头像</span>
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-sm overflow-hidden bg-gray-100">
                {isLoadingProfile ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-gray-400">加载中...</span>
                  </div>
                ) : (
                  <IPFSImg
                    src={avatarCid}
                    fallbackSrc="/me/default.jpg"
                    alt="NFT Avatar"
                    className="w-full h-full object-cover"
                    enableLogging={true}
                    maxRetries={5}
                  />
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* 名字 */}
        <div className="bg-white border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">名字</span>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const bytes = new TextEncoder().encode(value).length;
                    // 如果超过64字节，截断到64字节
                    if (bytes > 64) {
                      let truncated = value;
                      while (new TextEncoder().encode(truncated).length > 64) {
                        truncated = truncated.slice(0, -1);
                      }
                      setEditedName(truncated);
                    } else {
                      setEditedName(value);
                    }
                  }}
                  disabled={isSaving}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="请输入昵称"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                >
                  <Check className="h-5 w-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                <span className="text-gray-600">
                  {isLoadingProfile ? '加载中...' : userName}
                </span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* 钱包地址 */}
        <ProfileItem
          label="钱包地址"
          rightContent={<ChevronRight className="h-5 w-5 text-gray-400" />}
          subContent={
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">
                {address || '未连接'}
              </span>
              {address && (
                <button onClick={copyAddress} className="flex-shrink-0">
                  <Image
                    src="/contacts/copy.svg"
                    alt="复制"
                    width={16}
                    height={16}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  />
                </button>
              )}
            </div>
          }
        />

        {/* 聊天公钥设置 */}
        <ProfileItem
          label="聊天公钥设置"
          rightContent={<ChevronRight className="h-5 w-5 text-gray-400" />}
        />

        {/* 我的二维码 */}
        <ProfileItem
          label="我的二维码"
          rightContent={
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-gray-600" />
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          }
        />

        {/* 分隔空间 */}
        <div className="h-2 bg-gray-50" />

        {/* 简历 */}
        <ProfileItem
          label="简历(要求完整输入)"
          rightContent={<ChevronRight className="h-5 w-5 text-gray-400" />}
          subContent={
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-[#909399]">
                {isLoadingProfile ? '加载中...' : `${userName}的在线简历`}
              </span>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded">
                <Image
                  src="/profile/Certification.png"
                  alt="认证"
                  width={12}
                  height={12}
                  className="w-3 h-3"
                />
                <span className="text-[10px] text-blue-600 font-medium">
                  官方认证
                </span>
              </div>
            </div>
          }
        />

        {/* 分隔空间 */}
        <div className="h-2 bg-gray-50" />

        {/* 接受数字货币合约地址 */}
        <ProfileItem
          label="接受数字货币合约地址"
          rightContent={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 py-1 rounded-lg">
                <Image
                  src="/top/bnb.png"
                  alt="BNB"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">BNB</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          }
        />

        {/* 分隔空间 */}
        <div className="h-2 bg-gray-50" />

        {/* 消息收入 */}
        <div className="bg-white px-4 py-3">
          <h3 className="text-base font-medium text-gray-900 mb-3">消息收入</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">好友聊天</span>
              <span className="text-sm font-medium text-[#9da0a6]">
                10UNICHAT/条
              </span>
            </div>
            {/* 竖线分隔 */}
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900">非好友聊天</span>
              <span className="text-sm font-medium text-[#9da0a6]">
                14UNICHAT/条
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 头像选择弹窗 */}
      {showAvatarOptionsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="w-full bg-white rounded-t-3xl shadow-xl animate-slide-up">
            {/* 标题 */}
            <div className="text-center py-6 border-b border-gray-100">
              <h2 className="text-base font-medium text-gray-900">
                修改NFT头像
              </h2>
            </div>

            {/* 选项 */}
            <div className="p-4">
              <label className="block w-full">
                <div className="text-center py-4 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors">
                  <span className="text-base text-gray-900">
                    从手机相册选择
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleAvatarChange(e);
                    setShowAvatarOptionsModal(false);
                    setShowAvatarModal(true);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* 取消按钮 */}
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowAvatarOptionsModal(false)}
                className="w-full text-center py-4 text-base text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 头像编辑弹窗 */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">更换头像</h2>
              <button
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarFile(null);
                  setAvatarPreview('');
                }}
                disabled={isUploadingAvatar}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {/* 头像预览 */}
              <div className="flex justify-center">
                <label className="cursor-pointer">
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center hover:opacity-80 transition-opacity">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IPFSImg
                        src={avatarCid}
                        fallbackSrc="/me/default.jpg"
                        alt="Current avatar"
                        className="w-full h-full object-cover"
                        enableLogging={true}
                        maxRetries={5}
                      />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-6 border-t">
              <button
                onClick={handleSaveAvatar}
                disabled={isUploadingAvatar || !avatarFile}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingAvatar ? '上传中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 个人资料项组件
interface ProfileItemProps {
  label: string;
  rightContent: React.ReactNode;
  subContent?: React.ReactNode;
}

function ProfileItem({ label, rightContent, subContent }: ProfileItemProps) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3 hover:bg-gray-50 cursor-pointer">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {rightContent}
      </div>
      {subContent && <div>{subContent}</div>}
    </div>
  );
}
