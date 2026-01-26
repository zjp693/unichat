'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  useChainId,
  useChains,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWatchContractEvent,
  useAccount,
  usePublicClient
} from 'wagmi';
import { zeroHash } from 'viem';
import { Loader2, Camera, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadImageToPinata } from '@/lib/pinata-upload';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useCommunityMembers } from '@/hooks/useCommunityMembers';
import { usePeerAvatar } from '@/hooks/usePeerProfile';
import { IPFSImg } from '@/components/ui/ipfs-img';
import { ChainSelectorDropdown } from '@/components/chat/chain-selector-dropdown';
import { useUpdateGroupSettings } from '@/hooks/useUpdateGroupSettings';
import type { Address, Abi } from 'viem';
import { getContractAddress } from '@/lib/web3/contracts';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import RedPacketGroupViewABI from '@/contract/abi/RedPacketGroupView.json';
import CommunityABI from '@/contract/abi/community.json';
import { erc20Abi } from 'viem';

// 定义布局常量，可以从公共文件导入或在此定义
const TOP_BAR_HEIGHT = 56;
const NAV_BAR_HEIGHT = 56;
const TOTAL_HEADER_HEIGHT = TOP_BAR_HEIGHT + NAV_BAR_HEIGHT;

// 单个成员项组件 - 显示头像和昵称
function MemberItem({ address }: { address: Address }) {
  const { avatarCid, name, isLoading } = usePeerAvatar(address);

  // 显示名称：优先使用昵称，否则显示地址缩写
  const displayName = name || `${address.slice(0, 4)}...${address.slice(-3)}`;

  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200">
        {isLoading ? (
          <div className="w-full h-full animate-pulse bg-gray-300" />
        ) : avatarCid ? (
          <IPFSImg
            src={avatarCid}
            alt={displayName}
            fallbackSrc="/me/me2.png"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-sm font-medium">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <span className="text-xs mt-1 truncate w-12 text-center text-gray-700">
        {displayName}
      </span>
    </div>
  );
}

interface GroupChatInfoPanelProps {
  conversationId: string;
  chatType: 'group' | 'private';
  memberCount: number;
  groupName?: string;
  groupType?: 'community' | 'redpacket';
  onClose: () => void;
}

export default function GroupChatInfoPanel({
  conversationId,
  chatType,
  memberCount,
  groupName: initialGroupName,
  groupType = 'community',
  onClose
}: GroupChatInfoPanelProps) {
  // 路由
  const router = useRouter();

  // 获取当前链信息
  const chainId = useChainId();
  const chains = useChains();
  const publicClient = usePublicClient();
  const currentChain = chains.find((c) => c.id === chainId);
  const chainName = currentChain?.name || 'Unknown';
  const chainShortName = chainName.charAt(0).toUpperCase();

  // 链图标映射（根据链 ID 或链名称）
  const getChainIcon = (name: string, id: number): string => {
    // 按链 ID 精确匹配
    const iconByChainId: Record<number, string> = {
      1: '/chain/Ethereum.png', // Ethereum Mainnet
      10: '/chain/OP Mainnet.png', // Optimism
      56: '/chain/BNB Chain.png', // BNB Smart Chain
      137: '/chain/Polygon.png', // Polygon
      204: '/chain/BNB Chain.png', // opBNB (BNB 系)
      8453: '/chain/Base.png', // Base
      42161: '/chain/Arbitrum.png', // Arbitrum One
      43114: '/chain/Avalanche.png', // Avalanche
      81457: '/chain/Blast.png' // Blast
    };

    if (iconByChainId[id]) {
      return iconByChainId[id];
    }

    // 按名称模糊匹配
    const nameLower = name.toLowerCase();
    if (nameLower.includes('arbitrum')) return '/chain/Arbitrum.png';
    if (nameLower.includes('optimism') || nameLower.includes('op'))
      return '/chain/OP Mainnet.png';
    if (nameLower.includes('polygon')) return '/chain/Polygon.png';
    if (nameLower.includes('bnb') || nameLower.includes('bsc'))
      return '/chain/BNB Chain.png';
    if (nameLower.includes('base')) return '/chain/Base.png';
    if (nameLower.includes('ethereum') || nameLower.includes('eth'))
      return '/chain/Ethereum.png';

    // 默认返回空，使用首字母
    return '';
  };

  const chainIcon = getChainIcon(chainName, chainId);

  // 获取分配比例（只在红包群时查询）
  const isRedPacket = groupType === 'redpacket';

  // --- 批量读取群基础信息 (Multicall 优化) ---
  const { data: batchData, refetch: refetchBatch } = useReadContracts({
    contracts: isRedPacket
      ? [
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'BPS_OWNER'
          },
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'BPS_REF'
          },
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'BPS_POOL'
          },
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'mainOwner'
          },
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'groupToken'
          },
          {
            address: conversationId as `0x${string}`,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'entryFeeAmount'
          }
        ]
      : [
          {
            address: conversationId as `0x${string}`,
            abi: CommunityABI.abi as Abi,
            functionName: 'owner'
          },
          {
            address: conversationId as `0x${string}`,
            abi: CommunityABI.abi as Abi,
            functionName: 'topicToken'
          }
        ],
    query: {
      enabled: !!conversationId,
      staleTime: 3000,
      refetchOnWindowFocus: false
    }
  });

  // 解析批量读取的结果
  const bpsOwner = isRedPacket ? (batchData?.[0]?.result as bigint) : undefined;
  const bpsRef = isRedPacket ? (batchData?.[1]?.result as bigint) : undefined;
  const bpsPool = isRedPacket ? (batchData?.[2]?.result as bigint) : undefined;
  const mainOwnerAddress = isRedPacket
    ? (batchData?.[3]?.result as string)
    : (batchData?.[0]?.result as string);
  const redPacketTokenAddress = isRedPacket
    ? (batchData?.[4]?.result as string)
    : undefined;
  const communityTokenAddress = !isRedPacket
    ? (batchData?.[1]?.result as string)
    : undefined;
  const entryFeeAmount = isRedPacket
    ? (batchData?.[5]?.result as bigint)
    : undefined;

  // 转换为百分比（bps / 100 = %）
  const ownerPercent = bpsOwner ? Number(bpsOwner) / 100 : 9;
  const refPercent = bpsRef ? Number(bpsRef) / 100 : 31;
  const poolPercent = bpsPool ? Number(bpsPool) / 100 : 60;

  // --- 统一获取红包群设置（包含头像） ---
  const { data: groupSettings } = useReadContract({
    address: getContractAddress(chainId, 'redPacketGroupView') || undefined,
    abi: RedPacketGroupViewABI.abi as Abi,
    functionName: 'getGroupSettings',
    args:
      isRedPacket && conversationId
        ? [conversationId as `0x${string}`]
        : undefined,
    query: {
      enabled: isRedPacket && !!conversationId,
      staleTime: 3000,
      refetchOnWindowFocus: false
    }
  });

  const [currentAvatarCid, setCurrentAvatarCid] = useState<string>('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatarCid, setNewAvatarCid] = useState<string>('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (
      groupSettings &&
      Array.isArray(groupSettings) &&
      groupSettings.length >= 5
    ) {
      const gAvatar = groupSettings[4] as string;
      const isValidCid =
        gAvatar &&
        gAvatar.trim() !== '' &&
        !gAvatar.startsWith('0x') &&
        (gAvatar.startsWith('Qm') || gAvatar.startsWith('bafy'));

      setCurrentAvatarCid(isValidCid ? gAvatar : '');

      // 同时按需初始化编辑状态
      if (groupSettings[0]) setEditGroupName(groupSettings[0] as string);
      if (groupSettings[1]) setEditEconomicModel(groupSettings[1] as string);
      if (groupSettings[2]) setEditGroupRules(groupSettings[2] as string);
      if (groupSettings[3]) setEditAnnouncement(groupSettings[3] as string);
    } else if (initialGroupName) {
      setEditGroupName(initialGroupName);
    }
  }, [groupSettings, initialGroupName]);

  // 处理头像选择并自动上传
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    try {
      setIsUploadingAvatar(true);
      const cid = await uploadImageToPinata(file);
      setNewAvatarCid(cid);
      toast({
        title: '图片已上传',
        description: '请点击下方保存按钮同步到链上',
        variant: 'success'
      });
    } catch (error: any) {
      console.error('上传失败:', error);
      toast({
        title: '上传失败',
        description: error.message || '图片上传失败，请重试',
        variant: 'destructive'
      });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 当前用户账户
  const { address: currentUserAddress } = useAccount();

  // 是否是群主
  const isMainOwner =
    currentUserAddress && mainOwnerAddress
      ? currentUserAddress.toLowerCase() ===
        (mainOwnerAddress as string).toLowerCase()
      : false;

  // 检查是否是群成员
  const RED_PACKET_GROUP_VIEW_ADDRESS = getContractAddress(
    chainId,
    'redPacketGroupView'
  );

  const { data: redPacketMemberData, refetch: refetchRedPacketMember } =
    useReadContract({
      address: RED_PACKET_GROUP_VIEW_ADDRESS || undefined,
      abi: RedPacketGroupViewABI.abi as Abi,
      functionName: 'getMember',
      args:
        currentUserAddress && conversationId
          ? [conversationId as `0x${string}`, currentUserAddress]
          : undefined,
      query: {
        enabled:
          isRedPacket &&
          !!currentUserAddress &&
          !!RED_PACKET_GROUP_VIEW_ADDRESS &&
          !!conversationId
      }
    });

  const { data: communityMemberData, refetch: refetchCommunityMember } =
    useReadContract({
      address: conversationId as `0x${string}`,
      abi: CommunityABI.abi as Abi,
      functionName: 'isActiveMember',
      args: currentUserAddress ? [currentUserAddress] : undefined,
      query: { enabled: !isRedPacket && !!currentUserAddress }
    });

  const isMember = isRedPacket
    ? redPacketMemberData
      ? (redPacketMemberData as [boolean, bigint, number])[0]
      : false
    : communityMemberData
      ? (communityMemberData as boolean)
      : false;

  const refetchMember = isRedPacket
    ? refetchRedPacketMember
    : refetchCommunityMember;
  const [isJoining, setIsJoining] = useState(false);

  // --- 实时事件监听 (核心优化) ---
  // 1. 监听成员加入
  useWatchContractEvent({
    address: conversationId as `0x${string}`,
    abi: isRedPacket
      ? (RedPacketGroupABI.abi as Abi)
      : (CommunityABI.abi as Abi),
    eventName: 'Joined',
    onLogs() {
      console.log('检测到新成员加入，刷新中...');
      refetchMember(); // 刷新当前用户成员状态
    }
  });

  // 2. 监听群设置变更 (名字/头像)
  useWatchContractEvent({
    address: conversationId as `0x${string}`,
    abi: RedPacketGroupABI.abi as Abi,
    eventName: 'GroupNameUpdated',
    onLogs() {
      refetchBatch();
    }
  });

  useWatchContractEvent({
    address: conversationId as `0x${string}`,
    abi: RedPacketGroupABI.abi as Abi,
    eventName: 'GroupAvatarUpdated',
    onLogs() {
      refetchBatch();
    }
  });

  const handleJoinGroup = async () => {
    if (!currentUserAddress || !groupTokenAddress) return;
    setIsJoining(true);
    try {
      if (entryFeeAmount && BigInt(entryFeeAmount as bigint) > BigInt(0)) {
        const balance = (await publicClient?.readContract({
          address: groupTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [currentUserAddress]
        })) as bigint;
        if (!balance || balance < BigInt(entryFeeAmount as bigint)) {
          toast({ title: '余额不足', variant: 'destructive' });
          return;
        }
        await writeContractAsync({
          address: groupTokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [
            conversationId as `0x${string}`,
            BigInt(
              '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
            )
          ]
        });
      }
      await writeContractAsync({
        address: conversationId as `0x${string}`,
        abi: RedPacketGroupABI.abi as Abi,
        functionName: 'join',
        args: [0, zeroHash]
      });
      refetchMember();
      refetchBatch(); // 显式触发批量数据更新
    } catch (error: any) {
      console.error('加入失败:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const { toast } = useToast();
  const [editGroupName, setEditGroupName] = useState('');
  const [editAnnouncement, setEditAnnouncement] = useState('');
  const [editEconomicModel, setEditEconomicModel] = useState('');
  const [editGroupRules, setEditGroupRules] = useState('');
  const [editEntryFee, setEditEntryFee] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleSave = async () => {
    if (!isMainOwner) return;
    if (isUploadingAvatar) {
      toast({ title: '请稍候', description: '头像正在上传中' });
      return;
    }
    setIsSaving(true);
    try {
      // 验证进群费用（仅红包群）
      if (isRedPacket) {
        if (!editEntryFee || editEntryFee === '' || Number(editEntryFee) <= 0) {
          toast({
            title: '验证失败',
            description: '进群费用不能为空或为 0',
            variant: 'destructive'
          });
          setIsSaving(false);
          return;
        }
      }

      let newFeeWei = entryFeeAmount || BigInt(0);
      if (editEntryFee && tokenDecimals) {
        newFeeWei = BigInt(
          Math.floor(Number(editEntryFee) * Math.pow(10, Number(tokenDecimals)))
        );
      }

      await writeContractAsync({
        address: conversationId as `0x${string}`,
        abi: RedPacketGroupABI.abi as Abi,
        functionName: 'setGroupSettings',
        args: [
          editGroupName || '',
          editEconomicModel || '',
          editGroupRules || '',
          editAnnouncement || '',
          newFeeWei,
          newAvatarCid || currentAvatarCid // 换了用新的，没换用旧的
        ]
      });
      toast({ title: '已提交', description: '正在更新合约设置...' });
    } catch (error: any) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 统一代币地址
  const groupTokenAddress = isRedPacket
    ? redPacketTokenAddress
    : communityTokenAddress;

  // 获取代币符号
  const { data: tokenSymbol } = useReadContract({
    address: groupTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'symbol',
    query: {
      enabled: !!groupTokenAddress,
      staleTime: 3600000 // 代币信息几乎不变，给 1 小时缓存
    }
  });

  // 获取代币小数位
  const { data: tokenDecimals } = useReadContract({
    address: groupTokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
    query: {
      enabled: !!groupTokenAddress,
      staleTime: 3600000
    }
  });

  // 格式化进群费用
  const formatEntryFee = () => {
    if (!entryFeeAmount || !tokenDecimals) return '0';
    const decimals = Number(tokenDecimals);
    const fee = Number(entryFeeAmount) / Math.pow(10, decimals);
    // 如果是整数就不显示小数
    return fee % 1 === 0 ? fee.toString() : fee.toFixed(2);
  };

  const displayTokenSymbol = tokenSymbol || 'TOKEN';
  const displayEntryFee = formatEntryFee();

  // 新增：初始化进群费用的编辑状态 (已移至初始化之后)
  useEffect(() => {
    if (displayEntryFee && displayEntryFee !== '0' && editEntryFee === '') {
      setEditEntryFee(displayEntryFee);
    }
  }, [displayEntryFee]);

  // Trust Wallet 代币图标 URL
  const getTokenLogoUrl = (cId: number, address: string | undefined) => {
    if (!address) return null;

    const chainMap: Record<number, string> = {
      1: 'ethereum',
      56: 'smartchain',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      204: 'opbnb',
      43114: 'avalanche'
    };

    const chain = chainMap[cId];
    if (!chain) return null;

    // Trust Wallet 资产库 URL
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chain}/assets/${address}/logo.png`;
  };

  const tokenLogoUrl = getTokenLogoUrl(chainId, groupTokenAddress as string);

  // 图标加载失败状态
  const [tokenLogoError, setTokenLogoError] = useState(false);

  // 获取群成员地址列表（最多获取100个）
  const { members: memberAddresses, isLoading: isMembersLoading } =
    useCommunityMembers(conversationId, 0, 100, groupType);

  // 控制成员列表展开/收起状态
  const [showAllMembers, setShowAllMembers] = useState(false);

  // 置顶公告聊天开关状态
  const [isPinAnnouncementEnabled, setIsPinAnnouncementEnabled] =
    useState(false);

  // 默认显示14个成员（加邀请按钮共15格，即5列x3行），展开后显示全部
  const displayedMembers = showAllMembers
    ? memberAddresses
    : memberAddresses.slice(0, 14);

  // 群名称
  const groupName = initialGroupName || '未知群聊';

  // 新增：模拟 "我的群聊" 数据
  const myGroupsData = [
    {
      id: 'g1',
      name: '闲聊吹水群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    {
      id: 'g2',
      name: '张总XX业务群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    },
    { id: 'g3', name: '刘总XX业务群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g4',
      name: '何光XX业务群',
      avatars: [
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg',
        '/placeholder-user.jpg'
      ]
    },
    { id: 'g5', name: '项目讨论群', avatars: ['/placeholder-user.jpg'] },
    {
      id: 'g6',
      name: '家人群',
      avatars: ['/placeholder-user.jpg', '/placeholder-user.jpg']
    }
  ];

  const [showAllMyGroups, setShowAllMyGroups] = useState(false); // 控制 "我的群聊" 列表展开/收起状态
  const displayedMyGroups = showAllMyGroups ? myGroupsData : []; // 修正：收起时一个也不展示

  return (
    <div className="bg-gray-100 w-full h-full relative z-20">
      {/* Header - 使用统一的 PageHeader 组件 */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white shadow-sm">
        {/* 顶部钱包栏 */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ height: `${TOP_BAR_HEIGHT}px` }}
        >
          <div className="flex items-center gap-2">
            <ChainSelectorDropdown />
          </div>
        </div>

        {/* 页面标题栏 - 使用 PageHeader 组件 */}
        <PageHeader title="聊天信息" onBack={onClose} bordered={false} />
      </div>

      {/* 内容区域 */}
      <div
        className="absolute w-full overflow-y-auto bg-[#ededed]"
        style={{
          top: `${TOTAL_HEADER_HEIGHT}px`,
          bottom: 0
        }}
      >
        <div className="space-y-3">
          {/* 群成员 */}
          <div className="bg-white p-4">
            <h2 className="text-lg font-semibold mb-3">
              群成员 ({memberAddresses.length || memberCount})
            </h2>

            {isMembersLoading ? (
              // 加载中的骨架屏
              <div className="grid grid-cols-5 gap-4 text-center">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-md bg-gray-200 animate-pulse" />
                    <div className="w-10 h-3 mt-1 bg-gray-200 animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : memberAddresses.length === 0 ? (
              // 没有成员
              <div className="text-center text-gray-400 py-4">暂无成员</div>
            ) : (
              // 成员列表
              <div className="grid grid-cols-5 gap-4 text-center">
                {displayedMembers.map((address) => (
                  <MemberItem key={address} address={address as Address} />
                ))}

                {/* 邀请按钮 */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-md  flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                    <span className="text-xl">+</span>
                  </div>
                </div>
              </div>
            )}

            {/* 更多群成员按钮 */}
            {memberAddresses.length > 14 && (
              <div className="flex justify-center mt-4">
                <button
                  className="text-blue-500 text-sm flex items-center gap-1"
                  onClick={() => setShowAllMembers(!showAllMembers)}
                >
                  {showAllMembers ? (
                    <>
                      收起 <span className="text-xs">▲</span>
                    </>
                  ) : (
                    <>
                      更多群成员 <span className="text-xs">▼</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 群信息 */}
          <div className="bg-white px-4 space-y-3">
            {/* 群头像配置行 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群头像</span>
              <div className="relative group">
                <input
                  type="file"
                  id="panel-avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={!isMainOwner || isUploadingAvatar}
                />
                <label
                  htmlFor="panel-avatar-upload"
                  className={cn(
                    'relative block w-12 h-12 rounded-lg overflow-hidden border transition-all',
                    isMainOwner && !isUploadingAvatar
                      ? 'cursor-pointer hover:opacity-80 border-purple-200'
                      : 'cursor-default'
                  )}
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="预览"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <IPFSImg
                      src={currentAvatarCid}
                      alt="群头像"
                      fallbackSrc="/me/me1.png"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群名称</span>
              {isMainOwner ? (
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="text-right text-gray-500 bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 max-w-[180px]"
                  placeholder="请输入群名称"
                />
              ) : (
                <span className="text-gray-500">{groupName}</span>
              )}
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
              <span className="text-gray-700">群二维码</span>
              <Image
                src="/chats/qrcode.png"
                alt="QR Code"
                width={24}
                height={24}
              />
            </div>

            {/* 群合约 */}
            <div className="py-2">
              <div className="text-gray-700 mb-1">群合约</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 break-all">
                  {conversationId}
                </span>
                <button className="ml-2 p-1 rounded">
                  <Image
                    src="/contacts/copy.svg"
                    alt="Copy"
                    width={16}
                    height={16}
                  />
                </button>
              </div>
            </div>

            {/* 我的群聊 */}
            {/* <div className="py-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">
                  我的群聊 ({myGroupsData.length})
                </span>
                <button
                  className="text-blue-500"
                  onClick={() => setShowAllMyGroups(!showAllMyGroups)}
                >
                  {showAllMyGroups ? '收起' : '展开所有群聊'}
                </button>
              </div>
              <div className="space-y-3">
                {displayedMyGroups.map((group) => (
                  <div key={group.id} className="flex items-center space-x-3">
                    <div className="relative flex -space-x-2">
                      {group.avatars.map((avatar, index) => (
                        <Image
                          key={index}
                          src={avatar}
                          alt="Group Avatar"
                          width={24}
                          height={24}
                          className="rounded-full border border-white"
                        />
                      ))}
                    </div>
                    <span className="text-gray-700">{group.name}</span>
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* 经济模型 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">经济模型</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editEconomicModel}
                onChange={(e) => setEditEconomicModel(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 群制度 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">群制度</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editGroupRules}
                onChange={(e) => setEditGroupRules(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 群公告 - 只有红包群显示 */}
          {isRedPacket && (
            <div className="bg-white p-4">
              <div className="text-gray-700 mb-2">群公告</div>
              <textarea
                placeholder="请输入..."
                rows={3}
                value={editAnnouncement}
                onChange={(e) => setEditAnnouncement(e.target.value)}
                readOnly={!isMainOwner}
                className={cn(
                  'w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none',
                  !isMainOwner && 'text-gray-500 cursor-default'
                )}
              />
            </div>
          )}

          {/* 邀请新人排行榜 - 只有红包群显示 */}
          {isRedPacket && (
            <div
              className="bg-white p-4 cursor-pointer active:bg-gray-50 transition-colors"
              onClick={() =>
                router.push(`/invite/rank?group=${conversationId}`)
              }
            >
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-700">邀请新人排行榜</span>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-green-500"
                >
                  <rect
                    x="4"
                    y="14"
                    width="4"
                    height="6"
                    fill="currentColor"
                    rx="1"
                  />
                  <rect
                    x="10"
                    y="8"
                    width="4"
                    height="12"
                    fill="currentColor"
                    rx="1"
                  />
                  <rect
                    x="16"
                    y="4"
                    width="4"
                    height="16"
                    fill="currentColor"
                    rx="1"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* 置顶公告聊天 */}
          <div className="bg-white p-4">
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-700">置顶公告聊天</span>
              <Switch
                checked={isPinAnnouncementEnabled}
                onCheckedChange={setIsPinAnnouncementEnabled}
                uncheckedColorClass="bg-gray-200"
                checkedColorClass="bg-blue-500"
              />
            </div>
          </div>

          {/* 群代币信息分组 */}
          <div className="bg-white p-4 space-y-3">
            {/* 群代币合约地址 */}
            <div className="pb-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-700">群代币合约地址</span>
                <div className="flex items-center gap-1.5">
                  {chainIcon ? (
                    <img
                      src={chainIcon}
                      alt={chainName}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {chainShortName}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{chainName}</span>
                </div>
              </div>
              <input
                type="text"
                value={(groupTokenAddress as string) || ''}
                readOnly
                className="w-full px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm text-gray-500 focus:outline-none focus:ring-0 cursor-default"
              />
            </div>

            {/* 代币名称 */}
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-gray-700">代币名称</span>
              <div className="flex items-center gap-1.5">
                {tokenLogoUrl && !tokenLogoError ? (
                  <img
                    src={tokenLogoUrl}
                    alt={displayTokenSymbol}
                    className="w-5 h-5 rounded-full object-cover"
                    onError={() => setTokenLogoError(true)}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
                    {displayTokenSymbol.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-gray-700">
                  {displayTokenSymbol}
                </span>
              </div>
            </div>

            {/* 进群费用 - 只有红包群显示 */}
            {isRedPacket && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">进群费用</span>
                <div className="flex items-center gap-1.5">
                  {isMainOwner ? (
                    <input
                      type="number"
                      step="any"
                      value={editEntryFee}
                      onChange={(e) => setEditEntryFee(e.target.value)}
                      className="w-24 text-right text-sm text-gray-700 bg-transparent border-0 p-0 focus:outline-none focus:ring-0"
                      placeholder="0"
                    />
                  ) : (
                    <span className="text-sm text-gray-700">
                      {displayEntryFee}
                    </span>
                  )}
                  {tokenLogoUrl && !tokenLogoError ? (
                    <img
                      src={tokenLogoUrl}
                      alt={displayTokenSymbol}
                      className="w-5 h-5 rounded-full object-cover"
                      onError={() => setTokenLogoError(true)}
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {displayTokenSymbol.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm text-gray-700">
                    {displayTokenSymbol}
                  </span>
                </div>
              </div>
            )}

            {/* 群聊建群分配比例 - 只有红包群群主可见 */}
            {isRedPacket && isMainOwner && (
              <div className="pt-2">
                <div className="flex justify-between items-center py-2 mb-4">
                  <span className="text-gray-700">群聊建群分配比例</span>
                  <span className="text-sm text-gray-700">
                    {ownerPercent + refPercent + poolPercent}%/100%
                  </span>
                </div>

                <div className="space-y-3 pl-4 bg-[#fbfbfb] py-3 px-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      群主可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">
                      {ownerPercent}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      邀请人可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">{refPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      群成员可获得群收益
                    </span>
                    <span className="text-sm text-gray-700">
                      {poolPercent}%
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* 修改并保存按钮 - 只有红包群群主可见 */}
            {isRedPacket && isMainOwner && (
              <div className="px-4 pb-4 pt-4">
                <button
                  className={cn(
                    'w-full h-12 bg-green-500 text-white rounded-full text-base font-medium shadow-lg',
                    isSaving && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? '保存中...' : '修改并保存'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
