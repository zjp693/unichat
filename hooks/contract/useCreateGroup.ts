'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId
} from 'wagmi';
import { parseUnits, decodeEventLog } from 'viem';
import GroupFactoryArtifact from '@/contract/abi/GroupFactory.json';
import { getContractAddress } from '@/lib/web3/contracts';

/**
 * 创建群组参数
 */
export interface CreateGroupParams {
  /** 群代币地址 */
  groupToken: `0x${string}`;
  /** 入群费用 (wei) */
  entryFee: bigint;
  /** 群名称 */
  groupName: string;
  /** 群规则 */
  groupRules: string;
  /** 群头像 CID */
  groupAvatar: string;
}

/**
 * 创建群组的状态
 */
export type CreateGroupStatus =
  | { state: 'idle' }
  | { state: 'preparing' }
  | { state: 'waiting_signature' }
  | { state: 'creating'; txHash: `0x${string}` }
  | { state: 'success'; groupAddress: `0x${string}` }
  | { state: 'error'; error: string };

/**
 * 创建群组 Hook
 *
 * 功能：
 * 1. 调用 GroupFactory.createGroup() 创建新群组
 * 2. 等待交易确认
 * 3. 从 GroupCreated 事件中解析新群地址
 * 4. 提供状态管理和错误处理
 */
export function useCreateGroup() {
  const [status, setStatus] = useState<CreateGroupStatus>({ state: 'idle' });
  const chainId = useChainId();

  const {
    writeContractAsync,
    data: txHash,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash: status.state === 'creating' ? status.txHash : undefined
  });

  /**
   * 创建群组
   */
  const createGroup = async (params: CreateGroupParams) => {
    try {
      setStatus({ state: 'preparing' });

      // 从多链配置获取 GroupFactory 地址
      const factoryAddress = getContractAddress(chainId, 'groupFactory');
      if (!factoryAddress) {
        throw new Error(`当前链 ${chainId} 不支持或缺少 GroupFactory 合约地址`);
      }

      setStatus({ state: 'waiting_signature' });

      // 调用合约
      const hash = await writeContractAsync({
        address: factoryAddress,
        abi: GroupFactoryArtifact.abi,
        functionName: 'createGroup',
        args: [
          params.groupToken,
          params.entryFee,
          params.groupName,
          params.groupRules,
          params.groupAvatar || ''
        ]
      });

      setStatus({ state: 'creating', txHash: hash });
    } catch (error) {
      console.error('❌ 创建群组失败:', error);
      const errorMessage =
        error instanceof Error ? error.message : '创建群组失败';

      // 解析用户拒绝
      if (errorMessage.toLowerCase().includes('user rejected')) {
        setStatus({ state: 'idle' });
      } else {
        setStatus({ state: 'error', error: errorMessage });
      }
      // 不再抛出错误，让 UI 通过 status 响应
    }
  };

  // 移除监听交易提交状态的 useEffect (已通过 await writeContractAsync 处理)
  // useEffect(() => {
  //   if (txHash && !isSuccess && !isConfirming) {
  //     setStatus({ state: 'creating', txHash });
  //   }
  // }, [txHash, isSuccess, isConfirming]);

  // 监听交易成功并解析事件
  useEffect(() => {
    if (isSuccess && receipt && status.state === 'creating') {
      // 从 GroupCreated 事件中获取新群地址
      const groupCreatedLog = receipt.logs.find((log) => {
        try {
          const decoded = decodeEventLog({
            abi: GroupFactoryArtifact.abi,
            data: log.data,
            topics: log.topics
          });
          return decoded.eventName === 'GroupCreated';
        } catch {
          return false;
        }
      });

      if (groupCreatedLog) {
        try {
          const decoded = decodeEventLog({
            abi: GroupFactoryArtifact.abi,
            data: groupCreatedLog.data,
            topics: groupCreatedLog.topics
          });

          const groupAddress = (decoded.args as any).group as `0x${string}`;
          setStatus({ state: 'success', groupAddress });
        } catch (e) {
          console.error('解析 GroupCreated 事件失败:', e);
          setStatus({ state: 'error', error: '群组创建成功但地址解析失败' });
        }
      } else {
        console.warn('⚠️ 未找到 GroupCreated 事件');
        // 可能是因为 receipt status 为 reverted?
        if (receipt.status === 'reverted') {
          setStatus({ state: 'error', error: '交易被回滚 (Reverted)' });
        } else {
          setStatus({ state: 'error', error: '未找到群组创建事件' });
        }
      }
    }
  }, [isSuccess, receipt, status.state]);

  // 监听写入错误 (保留作为兜底，虽然 try-catch 已经处理了大部分)
  useEffect(() => {
    if (writeError) {
      const errorMessage = parseContractError(writeError);
      // 只有在非 idle/success 状态下才更新 error，避免覆盖
      if (status.state !== 'idle' && status.state !== 'success') {
        setStatus({ state: 'error', error: errorMessage });
      }
    }
  }, [writeError, status.state]);

  // 稳定的 reset 函数
  const reset = useCallback(() => {
    setStatus({ state: 'idle' });
  }, []);

  return {
    createGroup,
    status,
    isLoading: isPending || isConfirming,
    txHash,
    reset
  };
}

/**
 * 解析合约错误
 */
function parseContractError(error: Error): string {
  const message = error.message;

  if (message.includes('User rejected') || message.includes('user rejected')) {
    return '用户取消了交易';
  }

  if (message.includes('insufficient funds')) {
    return '余额不足';
  }

  if (message.includes('token not allowed')) {
    return '该代币不支持创建群聊';
  }

  if (message.includes('fee=0')) {
    return '入群费用必须大于0';
  }

  // 默认错误消息
  return '创建群组失败，请重试';
}
