import { useEffect } from 'react';
import { useWatchContractEvent, usePublicClient } from 'wagmi';
import { RED_PACKET_CONTRACT_ADDRESS, RedPacketAbi } from '@/lib/RedPacketAbi';
import type { Message } from '@/lib/chat/types';
import type { Address } from 'viem';
import { decodeEventLog } from 'viem';

// ============= 类型定义 =============

interface UseRedPacketEventsProps {
  chatType: 'private' | 'group';
  groupAddress?: Address;
  recipientAddress?: Address;
  currentAddress?: Address;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  messages: Message[];
}

// ============= 工具函数 =============

/**
 * 创建红包领取系统消息
 */
async function createClaimMessage(
  publicClient: any,
  packetId: bigint,
  claimer: Address,
  isGroup: boolean,
  recipient: Address,
  currentAddress?: Address
): Promise<Message> {
  // 查询红包信息，获取创建者地址
  let creatorAddress: Address | undefined;
  try {
    const packet = (await publicClient?.readContract({
      address: RED_PACKET_CONTRACT_ADDRESS,
      abi: RedPacketAbi,
      functionName: 'getPacket',
      args: [packetId]
    })) as any;

    creatorAddress = packet?.creator;
  } catch (e) {
    console.error('查询红包创建者失败:', e);
  }

  // 生成昵称（目前使用地址缩写，后续在组件中使用 usePeerAvatar 获取真实昵称）
  const claimerName = claimer
    ? `${claimer.slice(0, 6)}...${claimer.slice(-4)}`
    : '未知';
  const ownerName = creatorAddress
    ? `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`
    : '红包创建者';

  return {
    id: `claim-event-${packetId.toString()}-${claimer}`,
    sender: 'system',
    senderAddress: claimer,
    content: JSON.stringify({
      claimerAddress: claimer,
      ownerAddress: creatorAddress,
      claimerName,
      ownerName,
      isCurrentUserClaimer:
        claimer?.toLowerCase() === currentAddress?.toLowerCase()
    }),
    timestamp: new Date(),
    type: 'red-packet-claim',
    recipient: recipient,
    isEncrypted: false,
    originalContent: null,
    isGroupMessage: isGroup,
    status: 'sent'
  };
}

/**
 * 检查群红包是否属于当前群组
 */
async function isGroupPacketRelevant(
  publicClient: any,
  packetId: bigint,
  groupAddress: Address
): Promise<boolean> {
  try {
    const packet = (await publicClient.readContract({
      address: RED_PACKET_CONTRACT_ADDRESS,
      abi: RedPacketAbi,
      functionName: 'getPacket',
      args: [packetId]
    })) as any;

    // 检查红包的 groupContract 是否是当前群组
    return packet?.groupContract?.toLowerCase() === groupAddress.toLowerCase();
  } catch (e) {
    console.error('查询群红包信息失败:', e);
    return false;
  }
}

/**
 * 检查私聊红包是否属于当前对话
 */
async function isPersonalPacketRelevant(
  publicClient: any,
  packetId: bigint,
  currentAddress: Address,
  recipientAddress: Address
): Promise<boolean> {
  try {
    const packet = (await publicClient.readContract({
      address: RED_PACKET_CONTRACT_ADDRESS,
      abi: RedPacketAbi,
      functionName: 'getPacket',
      args: [packetId]
    })) as any;

    const creator = packet?.creator?.toLowerCase();
    const recipient = packet?.personalRecipient?.toLowerCase();
    const currentUser = currentAddress.toLowerCase();
    const peer = recipientAddress.toLowerCase();

    // 检查红包是否涉及当前聊天的双方
    // 情况1: 我发给对方
    // 情况2: 对方发给我
    return (
      (creator === currentUser && recipient === peer) ||
      (creator === peer && recipient === currentUser)
    );
  } catch (e) {
    console.error('查询私聊红包信息失败:', e);
    return false;
  }
}

// ============= 事件处理器 =============

/**
 * 处理群红包领取事件
 */
async function handleGroupClaimEvent(
  log: any,
  groupAddress: Address,
  currentAddress: Address,
  publicClient: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<void> {
  try {
    const { id, claimer } = log.args;

    console.log('🔥 群红包领取事件', { id: id.toString(), claimer });

    // 检查红包是否属于当前群组
    const isRelevant = await isGroupPacketRelevant(
      publicClient,
      id,
      groupAddress
    );
    console.log('群红包是否相关:', isRelevant);

    if (!isRelevant) return;

    // 创建领取消息
    const claimMessage = await createClaimMessage(
      publicClient,
      id,
      claimer,
      true,
      groupAddress,
      currentAddress
    );

    console.log('✅ 创建群红包领取消息:', claimMessage);

    // 添加到消息列表（去重）
    setMessages((prev) => {
      if (prev.some((m) => m.id === claimMessage.id)) {
        return prev;
      }
      return [...prev, claimMessage];
    });
  } catch (e) {
    console.error('处理群红包领取事件失败:', e);
  }
}

/**
 * 处理私聊红包领取事件
 */
async function handlePersonalClaimEvent(
  log: any,
  recipientAddress: Address,
  currentAddress: Address,
  publicClient: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<void> {
  try {
    const { id, claimer } = log.args;

    // 检查红包是否属于当前对话
    const isRelevant = await isPersonalPacketRelevant(
      publicClient,
      id,
      currentAddress,
      recipientAddress
    );
    if (!isRelevant) return;

    // 创建领取消息
    const claimMessage = await createClaimMessage(
      publicClient,
      id,
      claimer,
      false,
      recipientAddress,
      currentAddress
    );

    // 添加到消息列表（去重）
    setMessages((prev) => {
      if (prev.some((m) => m.id === claimMessage.id)) {
        return prev;
      }
      return [...prev, claimMessage];
    });
  } catch (e) {
    console.error('处理私聊红包领取事件失败:', e);
  }
}

/**
 * 批量处理历史事件
 */
async function processHistoricalEvents(
  logs: any[],
  chatType: 'private' | 'group',
  groupAddress: Address | undefined,
  recipientAddress: Address | undefined,
  currentAddress: Address,
  publicClient: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
): Promise<void> {
  const claimMessages = await Promise.all(
    logs.map(async (log) => {
      try {
        const decoded = decodeEventLog({
          abi: RedPacketAbi,
          data: log.data,
          topics: log.topics
        });

        const isGroupClaim = decoded.eventName === 'GroupPacketClaimed';
        const isPersonalClaim = decoded.eventName === 'PersonalPacketClaimed';

        // 处理群红包领取事件
        if (isGroupClaim && chatType === 'group' && groupAddress) {
          const { id, claimer } = decoded.args as any;
          const isRelevant = await isGroupPacketRelevant(
            publicClient,
            id,
            groupAddress
          );

          if (isRelevant) {
            return await createClaimMessage(
              publicClient,
              id,
              claimer,
              true,
              groupAddress,
              currentAddress
            );
          }
        }
        // 处理私聊红包领取事件
        else if (
          isPersonalClaim &&
          chatType === 'private' &&
          recipientAddress
        ) {
          const { id, claimer } = decoded.args as any;
          const isRelevant = await isPersonalPacketRelevant(
            publicClient,
            id,
            currentAddress,
            recipientAddress
          );

          if (isRelevant) {
            return await createClaimMessage(
              publicClient,
              id,
              claimer,
              false,
              recipientAddress,
              currentAddress
            );
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    })
  );

  // 过滤掉 null 值并添加到消息列表（去重）
  claimMessages.filter(Boolean).forEach((claimMessage) => {
    if (claimMessage) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === claimMessage.id)) {
          return prev;
        }
        return [...prev, claimMessage];
      });
    }
  });
}

// ============= 主 Hook =============

/**
 * 监听红包领取事件，并添加系统提示消息
 * 包括实时事件监听和历史事件查询
 */
export function useRedPacketEvents({
  chatType,
  groupAddress,
  recipientAddress,
  currentAddress,
  setMessages,
  messages
}: UseRedPacketEventsProps) {
  const publicClient = usePublicClient();

  // ===== 加载历史领取事件 =====
  useEffect(() => {
    if (!publicClient || !currentAddress) return;

    const loadHistoricalEvents = async () => {
      try {
        console.log('📜 加载历史红包领取事件...');

        const currentBlock = await publicClient.getBlockNumber();
        // Arbitrum: 1区块≈0.25秒, 24小时≈345600个区块
        const fromBlock = currentBlock - BigInt(345600);

        const logs = await publicClient.getLogs({
          address: RED_PACKET_CONTRACT_ADDRESS,
          fromBlock,
          toBlock: currentBlock
        });

        console.log(`📦 找到 ${logs.length} 个历史事件（最近24小时）`);

        await processHistoricalEvents(
          logs,
          chatType,
          groupAddress,
          recipientAddress,
          currentAddress,
          publicClient,
          setMessages
        );
      } catch (error) {
        console.error('加载历史红包领取事件失败:', error);
      }
    };

    loadHistoricalEvents();
  }, [
    chatType,
    groupAddress,
    recipientAddress,
    currentAddress,
    publicClient,
    setMessages
  ]);

  // ===== 监听群红包领取事件（实时）=====
  useWatchContractEvent({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    eventName: 'GroupPacketClaimed',
    enabled: chatType === 'group' && !!groupAddress,
    onLogs(logs) {
      console.log('⚡ 收到群红包领取事件:', logs.length);

      if (!publicClient || !currentAddress || !groupAddress) return;

      logs.forEach((log) => {
        handleGroupClaimEvent(
          log,
          groupAddress,
          currentAddress,
          publicClient,
          setMessages
        );
      });
    }
  });

  // ===== 监听私聊红包领取事件（实时）=====
  useWatchContractEvent({
    address: RED_PACKET_CONTRACT_ADDRESS,
    abi: RedPacketAbi,
    eventName: 'PersonalPacketClaimed',
    enabled: chatType === 'private' && !!recipientAddress,
    onLogs(logs) {
      if (!publicClient || !currentAddress || !recipientAddress) return;

      logs.forEach((log) => {
        handlePersonalClaimEvent(
          log,
          recipientAddress,
          currentAddress,
          publicClient,
          setMessages
        );
      });
    }
  });
}
