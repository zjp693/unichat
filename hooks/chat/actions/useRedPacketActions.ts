import { useCallback } from 'react';
import {
  useWaitForTransactionReceipt,
  usePublicClient,
  useWriteContract,
  useChainId
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
  RedPacketAbi,
  getRedPacketAddress
} from '@/lib/RedPacketAbi';
import {
  DirectMessageAbi,
  getDirectMessageAddress
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
  const chainId = useChainId();
  const { writeContractAsync: approve } = useWriteContract();
  const { writeContractAsync: writeContract } = useWriteContract();
  const { writeContractAsync: claimPersonalPacket } = useClaimPersonalPacket();
  const { writeContractAsync: claimGroupPacket } = useClaimGroupPacket();

  // 获取当前链的合约地址
  const redPacketAddress = getRedPacketAddress(chainId);
  const directMessageAddress = getDirectMessageAddress(chainId);

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

      const decimals = await getTokenDecimals(
        tokenAddress as Address,
        publicClient
      );

      if (groupType === 'redpacket') {
        const perShare = parseUnits(inputAmount, decimals);
        const totalAmount = perShare * BigInt(count || 1);

        try {
          const hasBalance = await checkTokenBalance(
            tokenAddress as Address,
            currentAddress,
            totalAmount,
            decimals,
            publicClient
          );
          if (!hasBalance) return;

          await approveTokenIfNeeded(
            tokenAddress as Address,
            groupAddress as Address,
            totalAmount,
            currentAddress,
            publicClient,
            approve,
            chainId
          );

          const messageContent = JSON.stringify({
            message: memo || '恭喜发财，大吉大利',
            type: 'NORMAL',
            status: 'active',
            amount: formatUnits(totalAmount, decimals),
            count: count,
            tokenAddress: tokenAddress,
            groupType: 'redpacket',
            groupAddress: groupAddress
          });

          const createTxHash = await writeContract({
            address: groupAddress,
            abi: RedPacketGroupABI.abi as Abi,
            functionName: 'createNormalPacketAll',
            args: [tokenAddress, totalAmount, messageContent, 0n]
          });

          const createReceipt = await publicClient?.waitForTransactionReceipt({
            hash: createTxHash
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));

          const packetCreatedEvent = createReceipt?.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: RedPacketGroupABI.abi as Abi,
                  data: log.data,
                  topics: log.topics
                });
              } catch {
                return null;
              }
            })
            .find((event) => event?.eventName === 'PacketCreated');

          const packetId = (packetCreatedEvent as any)?.args?.packetId;

          if (!packetId) {
            throw new Error('无法获取红包 ID');
          }

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
        const isRandom = type === 'LUCKY';
        const totalShares = BigInt(count || 1);
        const expiryDuration = BigInt(5 * 24 * 60 * 60);

        let amount: bigint;
        let shareAmounts: bigint[] = [];

        if (isRandom) {
          amount = parseUnits(inputAmount, decimals);
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
          const perShare = parseUnits(inputAmount, decimals);
          amount = perShare * totalShares;
          shareAmounts = [];
        }

        try {
          const hasBalance = await checkTokenBalance(
            tokenAddress as Address,
            currentAddress,
            amount,
            decimals,
            publicClient
          );
          if (!hasBalance) return;

          await approveTokenIfNeeded(
            tokenAddress as Address,
            redPacketAddress as Address,
            amount,
            currentAddress,
            publicClient,
            approve,
            chainId
          );

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

          const receipt = await publicClient?.waitForTransactionReceipt({
            hash: txHash
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

          const optimisticMessage: Message = {
            id: `temp-group-${Date.now()}`,
            sender: 'user',
            senderAddress: currentAddress,
            content: JSON.stringify({
              packetId: packetId.toString(),
              message: memo || '恭喜发财，大吉大利',
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
      scrollToBottom,
      chainId,
      redPacketAddress
    ]
  );

  const handleSendPersonalRedPacket = useCallback(
    async (config: RedPacketConfig) => {
      if (!recipientAddress) {
        alert('接收人地址无效');
        return;
      }

      const { tokenAddress, amount: totalAmount, message: memo } = config;
      const expiryDuration = BigInt(5 * 24 * 60 * 60);

      const decimals = await getTokenDecimals(
        tokenAddress as Address,
        publicClient
      );

      const amount = parseUnits(totalAmount, decimals);

      try {
        const hasBalance = await checkTokenBalance(
          tokenAddress as Address,
          currentAddress,
          amount,
          decimals,
          publicClient
        );
        if (!hasBalance) return;

        await approveTokenIfNeeded(
          tokenAddress as Address,
          redPacketAddress as Address,
          amount,
          currentAddress,
          publicClient,
          approve,
          chainId
        );

        const txHash = await writeContract({
          address: directMessageAddress as `0x${string}`,
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

        const receipt = await publicClient?.waitForTransactionReceipt({
          hash: txHash
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
          status: 'sent',
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
      scrollToBottom,
      chainId,
      redPacketAddress,
      directMessageAddress
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

  const handleClaimRedPacket = useCallback(
    async (packetId: string, onTxSent?: () => void) => {
      try {
        let isRedPacketGroup = groupType === 'redpacket';
        let targetGroupAddress: Address | undefined = groupAddress as Address;

        if (selectedRedPacket) {
          try {
            const content = JSON.parse(selectedRedPacket.content);
            if (content.groupAddress) {
              targetGroupAddress = content.groupAddress as Address;
            }
            if (content.groupType === 'redpacket') {
              isRedPacketGroup = true;
            }
          } catch (e) {
            // 解析失败
          }
        }

        let txHash;

        if (isRedPacketGroup && targetGroupAddress) {
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
          const packet = (await publicClient?.readContract({
            address: redPacketAddress as `0x${string}`,
            abi: RedPacketAbi,
            functionName: 'getPacket',
            args: [BigInt(packetId)]
          })) as any;

          if (packet.packetType === 0) {
            const recipient = packet.personalRecipient?.toLowerCase();
            const current = currentAddress?.toLowerCase();

            if (recipient !== current) {
              if (packet.creator?.toLowerCase() === current) {
                alert('这是你发送的红包，只有接收者可以领取哦~');
              } else {
                alert('这个红包不是发给你的');
              }
              throw new Error('无权领取此红包');
            }

            txHash = await claimPersonalPacket({
              address: redPacketAddress as `0x${string}`,
              abi: RedPacketAbi,
              functionName: 'claimPersonalPacket',
              args: [BigInt(packetId)]
            });
          } else {
            txHash = await claimGroupPacket({
              address: redPacketAddress as `0x${string}`,
              abi: RedPacketAbi,
              functionName: 'claimGroupPacket',
              args: [BigInt(packetId)]
            });
          }
        }

        if (txHash) {
          onTxSent?.();
          const receipt = await publicClient?.waitForTransactionReceipt({
            hash: txHash
          });

          let claimedAmount = '0';
          if (!isRedPacketGroup) {
            try {
              const eventName = 'GroupPacketClaimed';
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
              // 忽略解析错误
            }
          }

          setSelectedRedPacket(null);
          if (selectedRedPacket) {
            setDetailsRedPacket(selectedRedPacket);
          }

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.type !== 'red-packet') return msg;
              let isTarget = false;
              try {
                const content = JSON.parse(msg.content);
                if (String(content.packetId) === String(packetId))
                  isTarget = true;
              } catch {
                if (
                  msg.content.startsWith('RP|') &&
                  msg.content.includes(packetId)
                ) {
                  // 忽略旧格式
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
                  // 忽略更新错误
                }
              }
              return msg;
            })
          );
        }
      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || '';
        const errorLower = errorMessage.toLowerCase();

        if (
          errorLower.includes('user rejected') ||
          errorLower.includes('user denied') ||
          errorLower.includes('rejected by user') ||
          errorLower.includes('user cancelled') ||
          errorLower.includes('cancelled')
        ) {
          throw error;
        }

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
      setDetailsRedPacket,
      groupAddress,
      groupType,
      currentAddress,
      redPacketAddress,
      setMessages,
      writeContract
    ]
  );

  const handleOpenRedPacket = useCallback(
    async (message: Message) => {
      let packetId: string | undefined;
      try {
        const json = JSON.parse(message.content);
        if (json.packetId) {
          packetId = json.packetId;
        }
      } catch (e) {
        if (message.content.startsWith('RP|')) {
          const parts = message.content.split('|');
          if (parts.length >= 3) {
            packetId = parts[2];
          }
        }
      }

      if (!packetId || !currentAddress || !publicClient) {
        setSelectedRedPacket(message);
        return;
      }

      try {
        let isRedPacketGroup = groupType === 'redpacket';
        let targetGroupAddress: Address | undefined = groupAddress;

        try {
          const messageContent = JSON.parse(message.content);
          if (messageContent.groupType === 'redpacket') {
            isRedPacketGroup = true;
          }
          if (messageContent.groupAddress) {
            targetGroupAddress = messageContent.groupAddress;
          }
        } catch (e) {
          // 忽略解析错误
        }

        if (isRedPacketGroup && targetGroupAddress) {
          const RedPacketGroupClaimedABI = parseAbi([
            'function claimed(uint256 packetId, address claimer) view returns (bool)'
          ]);

          const claimed = (await publicClient.readContract({
            address: targetGroupAddress,
            abi: RedPacketGroupClaimedABI,
            functionName: 'claimed',
            args: [BigInt(packetId), currentAddress]
          })) as boolean;

          if (claimed) {
            setDetailsRedPacket(message);
          } else {
            setSelectedRedPacket(message);
          }
        } else {
          const packet = (await publicClient.readContract({
            address: redPacketAddress as `0x${string}`,
            abi: RedPacketAbi,
            functionName: 'getPacket',
            args: [BigInt(packetId)]
          })) as any;

          if (
            packet.packetType === 0 &&
            packet.creator?.toLowerCase() === currentAddress.toLowerCase()
          ) {
            setDetailsRedPacket(message);
            return;
          }

          const claimed = (await publicClient.readContract({
            address: redPacketAddress as `0x${string}`,
            abi: RedPacketAbi,
            functionName: 'hasClaimed',
            args: [BigInt(packetId), currentAddress]
          })) as boolean;

          if (claimed) {
            setDetailsRedPacket(message);
          } else {
            setSelectedRedPacket(message);
          }
        }
      } catch (e: any) {
        const errorMessage = e?.message || String(e);

        if (errorMessage.includes('Packet not found')) {
          setDetailsRedPacket(message);
        } else {
          console.error('❌ 查询红包状态失败:', errorMessage);
          setSelectedRedPacket(message);
        }
      }
    },
    [
      publicClient,
      currentAddress,
      setSelectedRedPacket,
      setDetailsRedPacket,
      groupType,
      groupAddress,
      redPacketAddress
    ]
  );

  return {
    handleSendRedPacket,
    handleOpenRedPacket,
    handleClaimRedPacket
  };
}
