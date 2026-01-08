import { useCallback } from 'react';
import {
  useWaitForTransactionReceipt,
  usePublicClient,
  useWriteContract
} from 'wagmi';
import {
  parseUnits,
  formatUnits,
  decodeEventLog,
  erc20Abi,
  Abi,
  parseAbi
} from 'viem';
import type { Message } from '@/lib/chat/types';
import { RedPacketConfig } from '@/components/chat/red-packet/types';
import { Address } from '@/lib/utils';
import {
  useClaimPersonalPacket,
  useClaimGroupPacket,
  RED_PACKET_CONTRACT_ADDRESS,
  RedPacketAbi
} from '@/lib/RedPacketAbi';
import {
  DIRECT_MESSAGE_CONTRACT_ADDRESS,
  DirectMessageAbi
} from '@/lib/DirectMessageAbi';
import communityABI from '@/contract/abi/community.json';
import RedPacketGroupABI from '@/contract/abi/RedPacketGroupImplementation.json';
import {
  getTokenDecimals,
  checkTokenBalance,
  approveTokenIfNeeded
} from '@/lib/redpacket/tokenUtils';

interface UseRedPacketActionsProps {
  recipientAddress?: Address;
  groupAddress?: Address;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsActionsOpen: (open: boolean) => void;
  setSelectedRedPacket: (message: Message | null) => void;
  setDetailsRedPacket: (message: Message | null) => void;
  selectedRedPacket: Message | null;
  scrollToBottom: (behavior?: 'smooth' | 'auto') => void;
  currentAddress: Address;
  chatType: 'private' | 'group';
  groupType?: 'community' | 'redpacket';
}

export function useRedPacketActions({
  recipientAddress,
  groupAddress,
  setMessages,
  setIsActionsOpen,
  setSelectedRedPacket,
  setDetailsRedPacket,
  selectedRedPacket,
  scrollToBottom,
  currentAddress,
  chatType,
  groupType = 'community'
}: UseRedPacketActionsProps) {
  const publicClient = usePublicClient();
  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: writeContract } = useWriteContract();
  const { writeContractAsync: claimPersonalPacket } = useClaimPersonalPacket();
  const { writeContractAsync: claimGroupPacket } = useClaimGroupPacket();

  /**
   * 发送群聊红包
   * 新流程（优化为 2 步交易）：
   *
   * 官方群 (community):
   * 1. 计算金额：根据红包类型（普通/拼手气）计算总金额和份额。
   * 2. 余额检查：确保用户 Token 余额充足。
   * 3. 授权 (Approve)：检查并请求 ERC20 Token 授权给 RedPacket 合约。
   * 4. 一键发送：调用 Community 合约的 sendRedPacketMessage，内部自动创建红包并发送消息。
   *
   * 红包群 (redpacket):
   * 1. 计算金额：只支持普通红包（单价 × 数量）
   * 2. 余额检查：确保用户 Token 余额充足。
   * 3. 授权 (Approve)：检查并请求 ERC20 Token 授权给群合约。
   * 4. 创建红包：调用 RedPacketGroup 合约的 createNormalPacketAll。
   * 5. 发送消息：调用 sendMainMessage 发送包含红包信息的消息。
   */
  const handleSendGroupRedPacket = useCallback(
    async (config: RedPacketConfig) => {
      if (!groupAddress) {
        alert('群组地址无效');
        return;
      }

      const {
        tokenAddress,
        amount: inputAmount,
        count,
        type,
        message: memo
      } = config;

      // 动态获取 Token 精度
      const decimals = await getTokenDecimals(
        tokenAddress as Address,
        publicClient
      );

      // 🔀 根据群类型选择不同的处理逻辑
      if (groupType === 'redpacket') {
        // ========== 红包群逻辑 ==========
        console.log('🎁 [红包群] 开始发送普通红包...');

        // 红包群只支持普通红包
        const perShare = parseUnits(inputAmount, decimals);
        const totalAmount = perShare * BigInt(count || 1);

        console.log('💰 [红包群] 参数准备:', {
          inputAmount,
          count,
          decimals,
          perShare: perShare.toString(),
          totalAmount: totalAmount.toString()
        });

        try {
          // 1. 检查余额
          console.log('1️⃣ [红包群] 检查余额...');
          const hasBalance = await checkTokenBalance(
            tokenAddress as Address,
            currentAddress,
            totalAmount,
            decimals,
            publicClient
          );
          if (!hasBalance) return;

          // 2. 检查当前授权额度
          console.log('2️⃣ [红包群] 检查授权额度...');
          const currentAllowance = (await publicClient?.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [currentAddress, groupAddress]
          })) as bigint;
          console.log('当前授权额度:', {
            currentAllowance: currentAllowance?.toString(),
            requiredAmount: totalAmount.toString(),
            isEnough: currentAllowance >= totalAmount
          });

          // 3. 授权代币给群合约
          console.log('3️⃣ [红包群] 授权代币...', {
            tokenAddress,
            spenderAddress: groupAddress,
            amount: totalAmount.toString()
          });

          await approveTokenIfNeeded(
            tokenAddress as Address,
            groupAddress as Address,
            totalAmount,
            currentAddress,
            publicClient,
            approve
          );

          console.log('4️⃣ [红包群] 创建红包...', {
            groupAddress,
            tokenAddress,
            totalAmount: totalAmount.toString(),
            functionName: 'createNormalPacketAll',
            args: [tokenAddress, totalAmount.toString(), 'message']
          });

          // 先构建消息内容（包含红包信息），用于 createNormalPacketAll 的 message 参数
          const messageContent = JSON.stringify({
            message: memo || '恭喜发财，大吉大利',
            type: 'NORMAL',
            status: 'active',
            amount: formatUnits(totalAmount, decimals),
            count: count,
            tokenAddress: tokenAddress,
            groupType: 'redpacket', // 标识这是红包群的红包
            groupAddress: groupAddress // 保存群地址，用于查询
          });

          // 4. 创建红包（新合约：一步完成创建红包+发送消息）
          const createTxHash = await writeContract({
            address: groupAddress,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'createNormalPacketAll',
            args: [tokenAddress, totalAmount, messageContent]
          });

          console.log('⏳ [红包群] 等待红包创建确认...', createTxHash);
          const createReceipt = await publicClient?.waitForTransactionReceipt({
            hash: createTxHash
          });

          console.log('✅ [红包群] 红包创建成功');

          // 等待 1 秒，让网络状态稳定
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // 5. 从事件中解析 packetId
          console.log(
            '🔍 [红包群] 解析红包 ID，交易回执日志数量:',
            createReceipt?.logs.length
          );

          const packetCreatedEvent = createReceipt?.logs
            .map((log, index) => {
              try {
                const decoded = decodeEventLog({
                  abi: RedPacketGroupABI.abi as Abi,
                  data: log.data,
                  topics: log.topics
                });
                console.log(
                  `📋 [红包群] 日志 ${index}:`,
                  decoded.eventName,
                  decoded.args
                );
                return decoded;
              } catch {
                return null;
              }
            })
            .find((event) => event?.eventName === 'PacketCreated');

          console.log('🎯 [红包群] 找到的事件:', packetCreatedEvent);

          const packetId = (packetCreatedEvent as any)?.args?.packetId;

          if (!packetId) {
            console.error('❌ [红包群] 无法从事件中获取红包 ID');
            console.error('所有日志:', createReceipt?.logs);
            throw new Error('无法获取红包 ID');
          }

          console.log('✅ [红包群] 红包发送完成, ID:', packetId.toString());

          // 6. 构建乐观 UI 消息（添加 packetId 到消息内容）
          const fullMessageContent = JSON.stringify({
            packetId: packetId.toString(),
            message: memo || '恭喜发财，大吉大利',
            type: 'NORMAL',
            status: 'active',
            amount: formatUnits(totalAmount, decimals),
            count: count,
            tokenAddress: tokenAddress,
            groupType: 'redpacket',
            groupAddress: groupAddress
          });

          const optimisticMessage: Message = {
            id: `temp-group-${Date.now()}`,
            sender: 'user',
            senderAddress: currentAddress,
            content: fullMessageContent,
            timestamp: new Date(),
            status: 'sent',
            type: 'red-packet',
            recipient: groupAddress,
            isEncrypted: false,
            originalContent: null,
            isGroupMessage: true
          };

          setMessages((prev) => [...prev, optimisticMessage]);
          setIsActionsOpen(false);
          scrollToBottom('smooth');
        } catch (error) {
          console.error('❌ [红包群] 发送失败:', error);
          alert('发送失败，请查看控制台');
        }
      } else {
        // ========== 官方群逻辑（保持不变）==========
        console.log('🎁 [官方群] 开始发送红包...');

        const isRandom = type === 'LUCKY';
        const totalShares = BigInt(count || 1);
        const expiryDuration = BigInt(24 * 60 * 60);

        let amount: bigint;
        let shareAmounts: bigint[] = [];

        if (isRandom) {
          // 拼手气红包：输入的是【总金额】
          amount = parseUnits(inputAmount, decimals);

          // 前端生成随机份额
          let remainingAmount = amount;
          let remainingCount = Number(totalShares);

          for (let i = 0; i < Number(totalShares) - 1; i++) {
            const min = BigInt(1);
            const avg = remainingAmount / BigInt(remainingCount);
            const max = avg * BigInt(2);

            const random = BigInt(Math.floor(Math.random() * 100));
            let share = (max * random) / BigInt(100);

            if (share < min) share = min;

            const minRemaining = BigInt(remainingCount - 1) * min;
            if (remainingAmount - share < minRemaining) {
              share = remainingAmount - minRemaining;
            }

            shareAmounts.push(share);
            remainingAmount -= share;
            remainingCount--;
          }
          shareAmounts.push(remainingAmount);
        } else {
          // 普通红包：输入的是【单价】
          const perShare = parseUnits(inputAmount, decimals);
          amount = perShare * totalShares;
          shareAmounts = [];
        }

        console.log('💰 [官方群] 参数准备:', {
          type,
          inputAmount,
          count,
          isRandom,
          decimals,
          calculatedTotalAmountWei: amount.toString(),
          totalShares: totalShares.toString(),
          shareAmounts: shareAmounts.map((s) => s.toString())
        });

        try {
          console.log('🚀 [官方群] 开始发送红包流程...');

          // 检查余额
          const hasBalance = await checkTokenBalance(
            tokenAddress as Address,
            currentAddress,
            amount,
            decimals,
            publicClient
          );
          if (!hasBalance) return;

          // Token 授权
          await approveTokenIfNeeded(
            tokenAddress as Address,
            RED_PACKET_CONTRACT_ADDRESS,
            amount,
            currentAddress,
            publicClient,
            approve
          );

          console.log('2️⃣ [官方群] 调用群合约发送红包...');

          // 调用群聊合约的 sendRedPacketMessage
          const txHash = await writeContract({
            address: groupAddress,
            abi: communityABI.abi as Abi,
            functionName: 'sendRedPacketMessage',
            args: [
              tokenAddress,
              amount,
              totalShares,
              isRandom,
              shareAmounts,
              expiryDuration,
              0,
              memo || '恭喜发财，大吉大利'
            ]
          });

          console.log('⏳ [官方群] 等待交易确认...', txHash);
          const receipt = await publicClient?.waitForTransactionReceipt({
            hash: txHash
          });

          // 从日志中解析 PacketId
          const packetCreatedEvent = receipt?.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: RedPacketAbi,
                  data: log.data,
                  topics: log.topics
                });
              } catch {
                return null;
              }
            })
            .find((event) => event?.eventName === 'GroupPacketCreated');

          const packetId = (packetCreatedEvent as any)?.args?.id;

          if (!packetId) {
            throw new Error('无法获取红包 ID');
          }

          console.log('✅ [官方群] 红包创建成功, ID:', packetId.toString());

          // 构建乐观 UI 消息
          const content = memo || '恭喜发财，大吉大利';
          const optimisticMessage: Message = {
            id: `temp-group-${Date.now()}`,
            sender: 'user',
            senderAddress: currentAddress,
            content: JSON.stringify({
              packetId: packetId.toString(),
              message: content,
              type: isRandom ? 'LUCKY' : 'NORMAL',
              status: 'active',
              amount: formatUnits(amount, decimals),
              count: count
            }),
            timestamp: new Date(),
            status: 'sent',
            type: 'red-packet',
            recipient: groupAddress,
            isEncrypted: false,
            originalContent: null,
            isGroupMessage: true
          };

          setMessages((prev) => [...prev, optimisticMessage]);
          setIsActionsOpen(false);
          scrollToBottom('smooth');
        } catch (error) {
          console.error('❌ [官方群] 发送红包失败:', error);
          alert('发送失败，请查看控制台');
        }
      }
    },
    [
      groupAddress,
      groupType,
      currentAddress,
      publicClient,
      approve,
      writeContract,
      setMessages,
      setIsActionsOpen,
      scrollToBottom
    ]
  );

  /**
   * 发送私聊红包
   * 新流程（优化为 2 步交易）：
   * 1. 余额检查：确保用户 Token 余额充足。
   * 2. 授权 (Approve)：检查并请求 ERC20 Token 授权给 RedPacket 合约。
   * 3. 一键发送：调用 DirectMessage 合约的 sendRedPacketMessage，内部自动创建红包并发送消息。
   */
  const handleSendPersonalRedPacket = useCallback(
    async (config: RedPacketConfig) => {
      if (!recipientAddress) {
        alert('接收人地址无效');
        return;
      }

      const { tokenAddress, amount: totalAmount, message: memo } = config;
      const expiryDuration = BigInt(24 * 60 * 60);

      // 动态获取 Token 精度
      const decimals = await getTokenDecimals(
        tokenAddress as Address,
        publicClient
      );

      const amount = parseUnits(totalAmount, decimals);

      console.log('💰 [发送私聊红包] 参数准备:', {
        totalAmount,
        decimals,
        calculatedAmountWei: amount.toString(),
        tokenAddress
      });

      try {
        console.log('🚀 开始发送私聊红包流程...');

        // 检查余额
        const hasBalance = await checkTokenBalance(
          tokenAddress as Address,
          currentAddress,
          amount,
          decimals,
          publicClient
        );
        if (!hasBalance) return;

        // Token 授权
        await approveTokenIfNeeded(
          tokenAddress as Address,
          RED_PACKET_CONTRACT_ADDRESS,
          amount,
          currentAddress,
          publicClient,
          approve
        );

        console.log('2️⃣ 调用 DirectMessage 发送私聊红包...');

        // 调用 DirectMessage 合约的 sendRedPacketMessage
        // 参数: token, totalAmount, recipient, expiryDuration, memo
        const txHash = await writeContract({
          address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
          abi: DirectMessageAbi,
          functionName: 'sendRedPacketMessage',
          args: [
            tokenAddress,
            amount,
            recipientAddress,
            expiryDuration,
            memo || '恭喜发财，大吉大利'
          ]
        });

        console.log('⏳ 等待交易确认...', txHash);
        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: txHash
        });

        // 从日志中解析 PacketId (PersonalPacketCreated)
        const packetCreatedEvent = receipt?.logs
          .map((log) => {
            try {
              return decodeEventLog({
                abi: RedPacketAbi,
                data: log.data,
                topics: log.topics
              });
            } catch {
              return null;
            }
          })
          .find((event) => event?.eventName === 'PersonalPacketCreated');

        const packetId = (packetCreatedEvent as any)?.args?.id;

        if (!packetId) {
          throw new Error('无法获取红包 ID');
        }

        console.log('✅ 红包发送成功, ID:', packetId.toString());

        // 构建乐观 UI 消息
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender: 'user',
          senderAddress: currentAddress,
          content: JSON.stringify({
            packetId: packetId.toString(),
            message: memo || '恭喜发财，大吉大利',
            type: 'NORMAL',
            status: 'active',
            amount: totalAmount,
            tokenAddress: tokenAddress
          }),
          timestamp: new Date(),
          status: 'sent', // 交易已确认
          type: 'red-packet',
          recipient: recipientAddress,
          isEncrypted: false,
          originalContent: null,
          isGroupMessage: false
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setIsActionsOpen(false);
        scrollToBottom('smooth');
      } catch (error) {
        console.error('❌ 发送私聊红包失败:', error);
        alert('发送失败，请查看控制台');
      }
    },
    [
      recipientAddress,
      currentAddress,
      publicClient,
      approve,
      writeContract,
      setMessages,
      setIsActionsOpen,
      scrollToBottom
    ]
  );

  const handleSendRedPacket = useCallback(
    async (config: RedPacketConfig) => {
      if (chatType === 'group') {
        await handleSendGroupRedPacket(config);
      } else {
        await handleSendPersonalRedPacket(config);
      }
    },
    [chatType, handleSendGroupRedPacket, handleSendPersonalRedPacket]
  );

  /**
   * 领取红包
   * 流程：
   * 1. 识别红包类型：根据 packetId 获取红包信息，判断是个人红包还是群红包。
   * 2. 发起交易：调用合约的 claimPersonalPacket 或 claimGroupPacket。
   * 3. 等待确认：等待交易上链 (waitForTransactionReceipt)。
   * 4. UI 更新：
   *    - 关闭“开红包”弹窗 (setSelectedRedPacket(null))
   *    - 打开“红包详情”弹窗 (setDetailsRedPacket)
   */
  const handleClaimRedPacket = useCallback(
    async (packetId: string, onTxSent?: () => void) => {
      try {
        // 优先使用 Hook 的 Props 判断群类型，防止消息内容缺少 groupType 标识
        let isRedPacketGroup = groupType === 'redpacket';
        let targetGroupAddress: Address | undefined = groupAddress as Address;

        if (selectedRedPacket) {
          try {
            const content = JSON.parse(selectedRedPacket.content);
            // 如果内容里有显式的群地址，优先使用
            if (content.groupAddress) {
              targetGroupAddress = content.groupAddress as Address;
            }
            // 如果内容里显式声明了类型，也作为补充参考
            if (content.groupType === 'redpacket') {
              isRedPacketGroup = true;
            }
          } catch (e) {
            // 解析失败，保持 Props 默认值
          }
        }

        console.log('🎁 [领取红包] 开始领取', {
          packetId,
          isRedPacketGroup,
          targetGroupAddress,
          contractAddress: isRedPacketGroup
            ? targetGroupAddress
            : RED_PACKET_CONTRACT_ADDRESS
        });

        // 根据红包类型选择不同的合约和方法
        let txHash;

        if (isRedPacketGroup && targetGroupAddress) {
          // ========== 红包群红包领取 ==========
          console.log('🎁 [红包群] 领取红包...');

          const RedPacketGroupClaimABI = parseAbi([
            'function claimPacket(uint256 packetId)'
          ]);

          txHash = await writeContract({
            address: targetGroupAddress,
            abi: RedPacketGroupClaimABI,
            functionName: 'claimPacket',
            args: [BigInt(packetId)]
          });
        } else {
          // ========== 官方群红包领取 ==========
          console.log('🎁 [官方群] 领取红包...');

          const packet = (await publicClient?.readContract({
            address: RED_PACKET_CONTRACT_ADDRESS,
            abi: RedPacketAbi,
            functionName: 'getPacket',
            args: [BigInt(packetId)]
          })) as any;

          // 私聊红包权限检查：只有指定的接收者才能领取
          if (packet.packetType === 0) {
            const recipient = packet.personalRecipient?.toLowerCase();
            const current = currentAddress?.toLowerCase();

            if (recipient !== current) {
              console.log('❌ 无权领取此红包:', {
                recipient,
                current,
                isCreator: packet.creator?.toLowerCase() === current
              });

              // 如果是发送者点击，给出友好提示
              if (packet.creator?.toLowerCase() === current) {
                alert('这是你发送的红包，只有接收者可以领取哦~');
              } else {
                alert('这个红包不是发给你的');
              }
              throw new Error('无权领取此红包');
            }
          }

          if (packet.packetType === 0) {
            txHash = await claimPersonalPacket({
              address: RED_PACKET_CONTRACT_ADDRESS,
              abi: RedPacketAbi,
              functionName: 'claimPersonalPacket',
              args: [BigInt(packetId)]
            });
          } else {
            txHash = await claimGroupPacket({
              address: RED_PACKET_CONTRACT_ADDRESS,
              abi: RedPacketAbi,
              functionName: 'claimGroupPacket',
              args: [BigInt(packetId)]
            });
          }
        }

        if (txHash) {
          // 支付成功，通知外部触发动画
          onTxSent?.();

          console.log('⏳ 等待领取确认...', txHash);
          const receipt = await publicClient?.waitForTransactionReceipt({
            hash: txHash
          });
          console.log('✅ 领取成功');

          // 解析领取事件，获取领取金额（仅官方群红包）
          let claimedAmount = '0';
          if (!isRedPacketGroup) {
            try {
              // 官方群红包才需要解析事件类型
              const eventName = 'GroupPacketClaimed'; // 群红包默认事件
              const claimEvent = receipt?.logs
                .map((log) => {
                  try {
                    return decodeEventLog({
                      abi: RedPacketAbi,
                      data: log.data,
                      topics: log.topics
                    });
                  } catch {
                    return null;
                  }
                })
                .find((event) => event?.eventName === eventName);

              if (claimEvent) {
                claimedAmount = (claimEvent as any).args.amount.toString();
              }
            } catch (e) {
              console.error('解析领取事件失败:', e);
            }
          }

          // 注意：领取提示消息现在由事件监听统一处理（useRedPacketEvents）
          // 这样可以确保所有用户都能看到提示，包括领取者自己

          // UI 状态流转
          // 1. 关闭开红包弹窗
          setSelectedRedPacket(null);

          // 2. 打开详情弹窗
          if (selectedRedPacket) {
            setDetailsRedPacket(selectedRedPacket);
          }

          // 3. 手动更新本地消息状态，确保 UI 立即响应 (无需等待事件监听)
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.type !== 'red-packet') return msg;

              let isTarget = false;
              try {
                const content = JSON.parse(msg.content);
                if (content.packetId === packetId) isTarget = true;
              } catch {
                // 兼容旧格式 RP|...
                if (
                  msg.content.startsWith('RP|') &&
                  msg.content.includes(packetId)
                ) {
                  // 旧格式很难直接更新状态，暂时忽略
                }
              }

              if (isTarget) {
                try {
                  const content = JSON.parse(msg.content);
                  return {
                    ...msg,
                    content: JSON.stringify({
                      ...content,
                      status: 'claimed'
                    })
                  };
                } catch (e) {
                  console.error('更新红包状态失败:', e);
                }
              }
              return msg;
            })
          );
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || '';
        const errorLower = errorMessage.toLowerCase();

        // 用户取消交易 - 静默处理，不打印 console.error
        if (
          errorLower.includes('user rejected') ||
          errorLower.includes('user denied') ||
          errorLower.includes('rejected by user') ||
          errorLower.includes('user cancelled') ||
          errorLower.includes('cancelled')
        ) {
          console.log('👤 用户在钱包中取消了交易');
          throw error; // 抛出给上层处理，但不显示错误日志
        }

        // 其他错误 - 打印错误日志
        console.error('领取红包失败:', error);
        throw error;
      }
    },
    [
      publicClient,
      claimPersonalPacket,
      claimGroupPacket,
      selectedRedPacket,
      setSelectedRedPacket,
      setDetailsRedPacket
    ]
  );

  /**
   * 打开红包
   * 逻辑：
   * 1. 解析 packetId。
   * 2. 查询链上状态 (hasClaimed)。
   * 3. 如果已领取 -> 直接打开详情页。
   * 4. 如果未领取 -> 打开“开红包”弹窗。
   */
  const handleOpenRedPacket = useCallback(
    async (message: Message) => {
      let packetId: string | undefined;
      try {
        // 尝试解析 JSON (群红包 / Optimistic UI)
        const json = JSON.parse(message.content);
        if (json.packetId) {
          packetId = json.packetId;
        }
      } catch (e) {
        // 不是 JSON，尝试解析 RP 格式 (私聊红包)
        if (message.content.startsWith('RP|')) {
          const parts = message.content.split('|');
          if (parts.length >= 3) {
            packetId = parts[2];
          }
        }
      }

      if (!packetId || !currentAddress || !publicClient) {
        // 无法查询或缺少必要信息，兜底打开"开红包"弹窗
        setSelectedRedPacket(message);
        return;
      }

      try {
        // 先获取红包信息，判断是否是发送者
        const packet = (await publicClient.readContract({
          address: RED_PACKET_CONTRACT_ADDRESS,
          abi: RedPacketAbi,
          functionName: 'getPacket',
          args: [BigInt(packetId)]
        })) as any;

        // 如果是私聊红包且当前用户是发送者，直接打开详情页
        if (
          packet.packetType === 0 &&
          packet.creator?.toLowerCase() === currentAddress.toLowerCase()
        ) {
          console.log('👀 发送者查看自己发的私聊红包');
          setDetailsRedPacket(message);
          return;
        }

        // 检查是否已领取
        const claimed = (await publicClient.readContract({
          address: RED_PACKET_CONTRACT_ADDRESS,
          abi: RedPacketAbi,
          functionName: 'hasClaimed',
          args: [BigInt(packetId), currentAddress]
        })) as boolean;

        if (claimed) {
          setDetailsRedPacket(message);
        } else {
          setSelectedRedPacket(message);
        }
      } catch (e: any) {
        const errorMessage = e?.message || String(e);

        if (errorMessage.includes('Packet not found')) {
          console.warn(
            '⚠️ 红包不存在，可能是历史测试数据，packetId:',
            packetId
          );
          // 红包不存在，可能是旧数据，仍然尝试打开详情页（会显示"红包不存在"）
          setDetailsRedPacket(message);
        } else {
          console.error('❌ 查询红包状态失败:', errorMessage);
          // 其他错误，兜底打开"开红包"弹窗
          setSelectedRedPacket(message);
        }
      }
    },
    [publicClient, currentAddress, setSelectedRedPacket, setDetailsRedPacket]
  );

  return {
    handleSendRedPacket,
    handleOpenRedPacket,
    handleClaimRedPacket
  };
}
