import { useEffect } from 'react';
import { useWatchContractEvent, usePublicClient, useChainId } from 'wagmi';
import { RedPacketAbi, getRedPacketAddress } from '@/lib/RedPacketAbi';
import type { Message } from '@/lib/chat/types';
import type { Address } from 'viem';
import { erc20Abi, formatUnits } from 'viem';

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
  contractAddress: Address, // 新增：必须传入合约地址
  currentAddress?: Address,
  amount?: bigint
): Promise<Message> {
  // 查询红包信息，获取创建者地址和代币信息
  let creatorAddress: Address | undefined;
  let tokenSymbol = 'Token';
  let decimals = 18;

  try {
    const packet = (await publicClient?.readContract({
      address: contractAddress, // 使用传入的动态地址
      abi: RedPacketAbi,
      functionName: 'getPacket',
      args: [packetId]
    })) as any;

    creatorAddress = packet?.creator;
    const tokenAddress = packet?.token;

    if (
      tokenAddress &&
      tokenAddress !== '0x0000000000000000000000000000000000000000'
    ) {
      try {
        const [sym, dec] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'symbol'
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'decimals'
          })
        ]);
        tokenSymbol = sym as string;
        decimals = dec as number;
      } catch (e) {
        console.warn('获取代币信息失败:', e);
      }
    } else {
      tokenSymbol = 'ETH';
    }
  } catch (e) {
    console.error('查询红包信息失败:', e);
  }

  // 生成昵称
  const claimerName = claimer
    ? `${claimer.slice(0, 6)}...${claimer.slice(-4)}`
    : '未知';
  const ownerName = creatorAddress
    ? `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}`
    : '红包创建者';

  const formattedAmount = amount ? formatUnits(amount, decimals) : undefined;

  return {
    id: `claim-event-${packetId.toString()}-${claimer}`,
    sender: 'system',
    senderAddress: claimer,
    content: JSON.stringify({
      claimerAddress: claimer,
      ownerAddress: creatorAddress,
      claimerName,
      ownerName,
      amount: formattedAmount,
      tokenSymbol,
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
  groupAddress: Address,
  contractAddress: Address // 新增参数
): Promise<boolean> {
  try {
    const packet = (await publicClient.readContract({
      address: contractAddress,
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
  recipientAddress: Address,
  contractAddress: Address // 新增参数
): Promise<boolean> {
  try {
    const packet = (await publicClient.readContract({
      address: contractAddress,
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

/**
 * 更新消息列表中的红包状态
 */
function updateRedPacketStatus(
  messages: Message[],
  packetId: string,
  currentAddress: Address
): Message[] {
  return messages.map((msg) => {
    if (msg.type !== 'red-packet') return msg;

    try {
      // 尝试解析 JSON
      const content = JSON.parse(msg.content);
      if (content.packetId === packetId) {
        // 如果是当前用户发的红包，或者当前用户领取的红包，更新状态
        // 这里简单点，只要 ID 匹配就更新为 claimed，因为这通常意味着当前上下文知道了这个领取事件
        return {
          ...msg,
          content: JSON.stringify({
            ...content,
            status: 'claimed'
          })
        };
      }
    } catch (e) {
      // 忽略解析错误
    }
    return msg;
  });
}

/**
 * 处理群红包领取事件
 */
async function handleGroupClaimEvent(
  log: any,
  groupAddress: Address,
  currentAddress: Address,
  publicClient: any,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  contractAddress: Address // 新增参数
): Promise<void> {
  try {
    const { id, claimer, amount } = log.args;

    console.log('🔥 群红包领取事件', { id: id.toString(), claimer, amount });

    // 检查红包是否属于当前群组
    const isRelevant = await isGroupPacketRelevant(
      publicClient,
      id,
      groupAddress,
      contractAddress
    );
    if (!isRelevant) return;

    // 创建领取消息
    const claimMessage = await createClaimMessage(
      publicClient,
      id,
      claimer,
      true,
      groupAddress,
      contractAddress, // 传入合约地址
      currentAddress,
      amount
    );

    // 更新消息列表：添加提示消息 + 更新红包状态
    setMessages((prev) => {
      // 1. 更新红包状态
      const updatedMessages = updateRedPacketStatus(
        prev,
        id.toString(),
        currentAddress
      );

      // 2. 添加提示消息（去重）
      if (updatedMessages.some((m) => m.id === claimMessage.id)) {
        return updatedMessages;
      }
      return [...updatedMessages, claimMessage];
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
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  contractAddress: Address // 新增参数
): Promise<void> {
  try {
    const { id, claimer, amount } = log.args;

    // 检查红包是否属于当前对话
    const isRelevant = await isPersonalPacketRelevant(
      publicClient,
      id,
      currentAddress,
      recipientAddress,
      contractAddress
    );
    if (!isRelevant) return;

    // 创建领取消息
    const claimMessage = await createClaimMessage(
      publicClient,
      id,
      claimer,
      false,
      recipientAddress,
      contractAddress, // 传入合约地址
      currentAddress,
      amount
    );

    // 更新消息列表：添加提示消息 + 更新红包状态
    setMessages((prev) => {
      // 1. 更新红包状态
      const updatedMessages = updateRedPacketStatus(
        prev,
        id.toString(),
        currentAddress
      );

      // 2. 添加提示消息（去重）
      if (updatedMessages.some((m) => m.id === claimMessage.id)) {
        return updatedMessages;
      }
      return [...updatedMessages, claimMessage];
    });
  } catch (e) {
    console.error('处理私聊红包领取事件失败:', e);
  }
}

// ============= 主 Hook =============

/**
 * 监听红包领取事件，并添加系统提示消息
 * 包括实时事件监听和基于消息内容的历史领取记录查询
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
  const chainId = useChainId();
  const contractAddress = getRedPacketAddress(chainId);

  // ===== 基于消息内容加载历史领取记录 =====
  useEffect(() => {
    if (!publicClient || !currentAddress || !contractAddress) return;

    const loadClaimRecordsFromMessages = async () => {
      try {
        // 1. 从消息列表中提取所有红包 ID
        const packetIds: string[] = [];
        messages.forEach((msg) => {
          if (msg.type === 'red-packet') {
            try {
              const content = JSON.parse(msg.content);
              if (content.packetId) {
                packetIds.push(content.packetId);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        });

        if (packetIds.length === 0) return;

        // 去重
        const uniquePacketIds = [...new Set(packetIds)];

        // 2. 24 小时前的时间戳
        const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - 24 * 60 * 60;

        // 3. 对每个红包查询领取记录
        const claimMessagesPromises = uniquePacketIds.map(
          async (packetIdStr) => {
            try {
              const packetId = BigInt(packetIdStr);

              // 调用合约获取领取记录
              const claimRecords = (await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: RedPacketAbi,
                functionName: 'getClaimRecordsPaged',
                args: [packetId, BigInt(0), BigInt(50)] // 最多获取 50 条
              })) as Array<{
                claimer: Address;
                amount: bigint;
                claimedAt: bigint;
              }>;

              if (!claimRecords || claimRecords.length === 0) return [];

              // 4. 过滤出 24 小时内的记录
              const recentRecords = claimRecords.filter(
                (record) => Number(record.claimedAt) > twentyFourHoursAgo
              );

              // 5. 转换为系统提示消息
              const claimMessages = await Promise.all(
                recentRecords.map(async (record) => {
                  const isGroup = chatType === 'group';
                  const recipient = isGroup
                    ? (groupAddress as Address)
                    : (recipientAddress as Address);

                  return createClaimMessage(
                    publicClient,
                    packetId,
                    record.claimer,
                    isGroup,
                    recipient,
                    contractAddress,
                    currentAddress,
                    record.amount
                  );
                })
              );

              return claimMessages;
            } catch (e) {
              // 单个红包查询失败不影响其他
              return [];
            }
          }
        );

        const allClaimMessages = (
          await Promise.all(claimMessagesPromises)
        ).flat();

        if (allClaimMessages.length > 0) {
          setMessages((prev) => {
            let updatedMessages = [...prev];

            // 添加提示消息（去重）
            allClaimMessages.forEach((msg) => {
              if (!updatedMessages.some((m) => m.id === msg.id)) {
                // 找到对应红包消息的位置，在其后插入
                const packetId = msg.id.split('-')[2];
                const packetMsgIndex = updatedMessages.findIndex((m) => {
                  if (m.type !== 'red-packet') return false;
                  try {
                    const content = JSON.parse(m.content);
                    return content.packetId === packetId;
                  } catch {
                    return false;
                  }
                });

                if (packetMsgIndex !== -1) {
                  // 在红包消息后面插入领取提示
                  updatedMessages.splice(packetMsgIndex + 1, 0, msg);
                } else {
                  // 找不到对应红包，追加到末尾
                  updatedMessages.push(msg);
                }
              }
            });

            return updatedMessages;
          });
        }
      } catch (error) {
        // 静默处理错误，不影响用户体验
      }
    };

    // 只在消息列表有内容时执行
    if (messages.length > 0) {
      loadClaimRecordsFromMessages();
    }
  }, [
    messages.length, // 消息数量变化时重新检查
    chatType,
    groupAddress,
    recipientAddress,
    currentAddress,
    publicClient,
    setMessages,
    contractAddress
  ]);

  // ===== 监听群红包领取事件（实时）=====
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: RedPacketAbi,
    eventName: 'GroupPacketClaimed',
    enabled: chatType === 'group' && !!groupAddress && !!contractAddress,
    onLogs(logs) {
      console.log('⚡ 收到群红包领取事件:', logs.length);

      if (!publicClient || !currentAddress || !groupAddress || !contractAddress)
        return;

      logs.forEach((log) => {
        handleGroupClaimEvent(
          log,
          groupAddress,
          currentAddress,
          publicClient,
          setMessages,
          contractAddress
        );
      });
    }
  });

  // ===== 监听私聊红包领取事件（实时）=====
  useWatchContractEvent({
    address: contractAddress || undefined,
    abi: RedPacketAbi,
    eventName: 'PersonalPacketClaimed',
    enabled: chatType === 'private' && !!recipientAddress && !!contractAddress,
    onLogs(logs) {
      if (
        !publicClient ||
        !currentAddress ||
        !recipientAddress ||
        !contractAddress
      )
        return;

      logs.forEach((log) => {
        handlePersonalClaimEvent(
          log,
          recipientAddress,
          currentAddress,
          publicClient,
          setMessages,
          contractAddress
        );
      });
    }
  });
}
