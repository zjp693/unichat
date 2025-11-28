import { useCallback } from 'react';
import {
  useWaitForTransactionReceipt,
  usePublicClient,
  useWriteContract
} from 'wagmi';
import {
  parseUnits,
  formatUnits,
  getAddress,
  decodeEventLog,
  erc20Abi
} from 'viem';
import type { Message } from '@/lib/chat/types';
import { RedPacketConfig } from '@/components/chat/red-packet/types';
import { Address } from '@/lib/utils';
import {
  useCreatePersonalPacket,
  useCreateGroupPacket,
  useClaimPersonalPacket,
  useClaimGroupPacket,
  useGetPacket,
  useHasClaimed,
  RED_PACKET_CONTRACT_ADDRESS,
  RedPacketAbi,
  PacketType,
  PacketStatus
} from '@/lib/RedPacketAbi';
import {
  useSendMessage,
  DIRECT_MESSAGE_CONTRACT_ADDRESS,
  DirectMessageAbi
} from '@/lib/DirectMessageAbi';
import { useSendCommunityMessage } from '@/hooks/useSendCommunityMessage';
import {
  encodeDmRedPacketContent,
  decodeDmRedPacketContent,
  encodeGroupRedPacketCid
} from '@/lib/redpacket/encoding';

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
  chatType
}: UseRedPacketActionsProps) {
  const publicClient = usePublicClient();
  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: createPersonalPacket } =
    useCreatePersonalPacket();
  const { writeContractAsync: createGroupPacket } = useCreateGroupPacket();
  const { writeContractAsync: claimPersonalPacket } = useClaimPersonalPacket();
  const { writeContractAsync: claimGroupPacket } = useClaimGroupPacket();
  const { writeContractAsync: sendMessage } = useSendMessage();
  const { sendMessage: sendGroupMessage } = useSendCommunityMessage(
    groupAddress || '0x0000000000000000000000000000000000000000'
  );

  const { data: waitForTransaction } = useWaitForTransactionReceipt(); /**
   * 发送群聊红包
   * 流程：
   * 1. 计算金额：根据红包类型（普通/拼手气）计算总金额和份额。
   * 2. 余额检查：确保用户 Token 余额充足。
   * 3. 授权 (Approve)：检查并请求 ERC20 Token 授权。
   * 4. 创建红包 (Create)：调用 RedPacket 合约创建红包。
   * 5. 发送消息 (Send)：调用 Room 合约发送包含红包 ID 的群消息。
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
      const isRandom = type === 'LUCKY';
      const totalShares = BigInt(count || 1);
      const expiryDuration = BigInt(24 * 60 * 60); // 默认 24 小时过期

      // --- 1. 准备参数 & 计算金额 ---

      // 动态获取 Token 精度，默认为 18
      let decimals = 18;
      if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
        try {
          decimals = (await publicClient?.readContract({
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'decimals'
          })) as number;
        } catch (e) {
          console.warn('获取 Token 精度失败，使用默认值 18', e);
        }
      }

      let amount: bigint;
      let shareAmounts: bigint[] = [];

      if (isRandom) {
        // 拼手气红包：输入的是【总金额】

        amount = parseUnits(inputAmount, decimals);

        // 前端生成随机份额 (文档未提及，但合约报错 Invalid shares length，推测需传入)
        // 使用二倍均值法生成随机分配方案
        let remainingAmount = amount;
        let remainingCount = Number(totalShares);

        for (let i = 0; i < Number(totalShares) - 1; i++) {
          const min = BigInt(1);
          // 二倍均值法: 每次随机范围 [min, 剩余平均值 * 2]
          const avg = remainingAmount / BigInt(remainingCount);
          const max = avg * BigInt(2);

          // 简单的随机数生成 (0-100)
          const random = BigInt(Math.floor(Math.random() * 100));
          let share = (max * random) / BigInt(100);

          if (share < min) share = min;

          // 确保剩余金额足够分给剩下的人 (每人至少 1 wei)
          const minRemaining = BigInt(remainingCount - 1) * min;
          if (remainingAmount - share < minRemaining) {
            share = remainingAmount - minRemaining;
          }

          shareAmounts.push(share);
          remainingAmount -= share;
          remainingCount--;
        }
        // 最后一个拿走剩余所有
        shareAmounts.push(remainingAmount);
      } else {
        // 普通红包：输入的是【单价】，总金额 = 单价 * 数量
        const perShare = parseUnits(inputAmount, decimals);
        amount = perShare * totalShares;
        // 普通红包 shareAmounts 留空，由合约均分
        shareAmounts = [];
      }

      console.log('💰 [发送群红包] 参数准备:', {
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
        console.log('🚀 开始发送群红包流程...');

        // 检查余额
        if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
          const balance = (await publicClient?.readContract({
            address: tokenAddress as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [currentAddress]
          })) as bigint;

          console.log('💰 当前余额:', formatUnits(balance, decimals));

          if (balance < amount) {
            alert(`余额不足，当前余额: ${formatUnits(balance, decimals)}`);
            return;
          }
        }

        if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
          console.log('1️⃣ 请求 Token 授权...');
          const allowance = await publicClient?.readContract({
            address: tokenAddress as Address,
            abi: [
              {
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                name: 'allowance',
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'allowance',
            args: [currentAddress, RED_PACKET_CONTRACT_ADDRESS]
          });

          if ((allowance as bigint) < amount) {
            const approveTxHash = await approve({
              address: tokenAddress as Address,
              abi: [
                {
                  inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  name: 'approve',
                  outputs: [{ name: '', type: 'bool' }],
                  stateMutability: 'nonpayable',
                  type: 'function'
                }
              ],
              functionName: 'approve',
              args: [RED_PACKET_CONTRACT_ADDRESS, amount]
            });
            console.log('⏳ 等待授权确认...', approveTxHash);
            await publicClient?.waitForTransactionReceipt({
              hash: approveTxHash
            });
            console.log('✅ 授权成功');
          } else {
            console.log('✅ 已有足够授权，跳过');
          }
        }

        console.log('2️⃣ 创建群红包合约...');
        const args = [
          tokenAddress,
          amount,
          totalShares,
          isRandom,
          groupAddress,
          shareAmounts,
          expiryDuration
        ];

        try {
          await publicClient?.simulateContract({
            address: RED_PACKET_CONTRACT_ADDRESS,
            abi: RedPacketAbi,
            functionName: 'createGroupPacket',
            args: args,
            account: currentAddress
          });
          console.log('✅ 模拟交易成功');
        } catch (simError: any) {
          console.error('❌ 模拟交易失败:', simError);
          console.error('详细错误:', simError?.cause || simError?.message);
          console.error('合约参数:', {
            tokenAddress,
            amount: amount.toString(),
            totalShares: totalShares.toString(),
            isRandom,
            groupAddress,
            shareAmounts: [],
            expiryDuration: expiryDuration.toString()
          });
          throw simError;
        }

        const createTxHash = await createGroupPacket({
          address: RED_PACKET_CONTRACT_ADDRESS,
          abi: RedPacketAbi,
          functionName: 'createGroupPacket',
          args: args
        });

        console.log('⏳ 等待红包创建确认...', createTxHash);
        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: createTxHash
        });

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

        console.log('✅ 红包创建成功, ID:', packetId.toString());

        console.log('3️⃣ 发送群消息...');
        const cid = encodeGroupRedPacketCid(packetId);
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
          status: 'sending',
          type: 'red-packet',
          recipient: groupAddress,
          isEncrypted: false,
          originalContent: null,
          isGroupMessage: true
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const msgHash = await sendGroupMessage(content, 0, cid);

        if (msgHash) {
          console.log('⏳ 等待消息上链...', msgHash);
          await publicClient?.waitForTransactionReceipt({ hash: msgHash });
          console.log('✅ 消息已上链');
        }

        setIsActionsOpen(false);
        scrollToBottom('smooth');

        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...m, status: 'sent' } : m
          )
        );
      } catch (error) {
        console.error('❌ 发送群红包失败:', error);
        alert('发送失败，请查看控制台');
      }
    },
    [
      groupAddress,
      currentAddress,
      publicClient,
      approve,
      createGroupPacket,
      sendGroupMessage,
      setMessages,
      setIsActionsOpen,
      scrollToBottom
    ]
  );

  /**
   * 发送私聊红包
   * 流程：
   * 1. 余额检查与授权。
   * 2. 创建红包：调用 createPersonalPacket。
   * 3. 发送消息：调用 DirectMessage 合约发送 RP 格式的消息。
   */
  const handleSendPersonalRedPacket = useCallback(
    async (config: RedPacketConfig) => {
      if (!recipientAddress) {
        alert('接收人地址无效');
        return;
      }

      const { tokenAddress, amount: totalAmount, message: memo } = config;
      const amount = parseUnits(totalAmount, 18);
      const expiryDuration = BigInt(24 * 60 * 60);

      try {
        console.log('🚀 开始发送私聊红包流程...');

        if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
          console.log('1️⃣ 请求 Token 授权...');
          const allowance = await publicClient?.readContract({
            address: tokenAddress as Address,
            abi: [
              {
                inputs: [
                  { name: 'owner', type: 'address' },
                  { name: 'spender', type: 'address' }
                ],
                name: 'allowance',
                outputs: [{ name: '', type: 'uint256' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'allowance',
            args: [currentAddress, RED_PACKET_CONTRACT_ADDRESS]
          });

          if ((allowance as bigint) < amount) {
            const approveTxHash = await approve({
              address: tokenAddress as Address,
              abi: [
                {
                  inputs: [
                    { name: 'spender', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  name: 'approve',
                  outputs: [{ name: '', type: 'bool' }],
                  stateMutability: 'nonpayable',
                  type: 'function'
                }
              ],
              functionName: 'approve',
              args: [RED_PACKET_CONTRACT_ADDRESS, amount]
            });
            console.log('⏳ 等待授权确认...', approveTxHash);
            await publicClient?.waitForTransactionReceipt({
              hash: approveTxHash
            });
            console.log('✅ 授权成功');
          }
        }

        console.log('2️⃣ 创建私聊红包合约...');
        const createTxHash = await createPersonalPacket({
          address: RED_PACKET_CONTRACT_ADDRESS,
          abi: RedPacketAbi,
          functionName: 'createPersonalPacket',
          args: [tokenAddress, recipientAddress, amount, expiryDuration]
        });

        console.log('⏳ 等待红包创建确认...', createTxHash);
        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: createTxHash
        });

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

        console.log('3️⃣ 发送聊天消息...');
        const content = encodeDmRedPacketContent(
          packetId,
          tokenAddress as Address,
          memo || '恭喜发财，大吉大利'
        );

        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          sender: 'user',
          senderAddress: currentAddress,
          content: content,
          timestamp: new Date(),
          status: 'sending',
          type: 'text',
          recipient: recipientAddress,
          isEncrypted: false,
          originalContent: null,
          isGroupMessage: false
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const sendTxHash = await sendMessage({
          address: DIRECT_MESSAGE_CONTRACT_ADDRESS,
          abi: DirectMessageAbi,
          functionName: 'sendMessage',
          args: [recipientAddress, content]
        });

        setIsActionsOpen(false);
        scrollToBottom('smooth');

        publicClient
          ?.waitForTransactionReceipt({ hash: sendTxHash })
          .then(() => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticMessage.id
                  ? { ...msg, status: 'sent' }
                  : msg
              )
            );
          });
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
      createPersonalPacket,
      sendMessage,
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
        const packet = (await publicClient?.readContract({
          address: RED_PACKET_CONTRACT_ADDRESS,
          abi: RedPacketAbi,
          functionName: 'getPacket',
          args: [BigInt(packetId)]
        })) as any;

        let txHash;
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

        if (txHash) {
          // 支付成功，通知外部触发动画
          onTxSent?.();

          console.log('⏳ 等待领取确认...', txHash);
          await publicClient?.waitForTransactionReceipt({ hash: txHash });
          console.log('✅ 领取成功');

          // UI 状态流转
          // 1. 关闭开红包弹窗
          setSelectedRedPacket(null);

          // 2. 打开详情弹窗
          // 使用当前的 selectedRedPacket
          if (selectedRedPacket) {
            setDetailsRedPacket(selectedRedPacket);
          }
        }
      } catch (error) {
        console.error('领取红包失败:', error);
        // alert('领取失败，请重试');
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
        // 无法查询或缺少必要信息，兜底打开“开红包”弹窗
        setSelectedRedPacket(message);
        return;
      }

      try {
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
      } catch (e) {
        console.error('查询红包状态失败', e);
        // 查询失败，兜底打开“开红包”弹窗
        setSelectedRedPacket(message);
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
