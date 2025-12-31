'use client';

import { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagePermissionCheckerProps {
  groupAddress: string;
  className?: string;
}

interface CheckResult {
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function MessagePermissionChecker({
  groupAddress,
  className
}: MessagePermissionCheckerProps) {
  const { address: currentAddress } = useAccount();
  const publicClient = usePublicClient();
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);

  const checkPermissions = async () => {
    if (!currentAddress || !publicClient || !groupAddress) {
      setResults([
        {
          status: 'error',
          message: '无法检查',
          details: '钱包未连接或群地址无效'
        }
      ]);
      return;
    }

    setIsChecking(true);
    const checks: CheckResult[] = [];

    try {
      // 1. 检查是否是群成员
      try {
        const memberInfo = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ internalType: 'address', name: '', type: 'address' }],
              name: 'getMember',
              outputs: [
                { internalType: 'bool', name: 'exists', type: 'bool' },
                { internalType: 'uint64', name: 'joinAt', type: 'uint64' },
                { internalType: 'uint32', name: 'subgroupId', type: 'uint32' }
              ],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'getMember',
          args: [currentAddress]
        });

        const isMember = memberInfo[0];
        if (isMember) {
          const joinDate = new Date(Number(memberInfo[1]) * 1000);
          checks.push({
            status: 'success',
            message: '✅ 你是群成员',
            details: `加入时间: ${joinDate.toLocaleString()}`
          });
        } else {
          checks.push({
            status: 'error',
            message: '❌ 你还不是群成员',
            details: '请先加入群组才能发送消息'
          });
          setResults(checks);
          setIsChecking(false);
          return; // 不是成员就不用继续检查了
        }
      } catch (error) {
        checks.push({
          status: 'error',
          message: '❌ 无法检查成员状态',
          details: String(error)
        });
      }

      // 2. 检查禁言状态
      try {
        const muteUntil = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ internalType: 'address', name: '', type: 'address' }],
              name: 'globalMuteUntil',
              outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'globalMuteUntil',
          args: [currentAddress]
        });

        const now = Math.floor(Date.now() / 1000);
        const isMuted = Number(muteUntil) > now;

        if (isMuted) {
          const muteEndTime = new Date(Number(muteUntil) * 1000);
          checks.push({
            status: 'error',
            message: '❌ 你已被禁言',
            details: `禁言结束时间: ${muteEndTime.toLocaleString()}`
          });
        } else {
          checks.push({
            status: 'success',
            message: '✅ 未被禁言'
          });
        }
      } catch (error) {
        checks.push({
          status: 'warning',
          message: '⚠️ 无法检查禁言状态',
          details: String(error)
        });
      }

      // 3. 检查消息限制
      try {
        const limitType = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'mainMessageLimitType',
              outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'mainMessageLimitType'
        });

        const limitCount = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'mainMessageLimitCount',
              outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'mainMessageLimitCount'
        });

        const msgCount = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ internalType: 'address', name: '', type: 'address' }],
              name: 'mainMessageCounts',
              outputs: [
                { internalType: 'uint32', name: 'count', type: 'uint32' },
                { internalType: 'uint64', name: 'periodStart', type: 'uint64' }
              ],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'mainMessageCounts',
          args: [currentAddress]
        });

        const currentCount = msgCount[0];
        const limitTypeText =
          ['无限制', '每日', '每周'][Number(limitType)] || '未知';

        if (Number(limitType) === 0) {
          checks.push({
            status: 'success',
            message: '✅ 无消息限制'
          });
        } else if (currentCount >= limitCount) {
          checks.push({
            status: 'error',
            message: '❌ 已达到消息发送限制',
            details: `${limitTypeText}限制: ${currentCount}/${limitCount}`
          });
        } else {
          checks.push({
            status: 'success',
            message: '✅ 消息限制正常',
            details: `${limitTypeText}限制: ${currentCount}/${limitCount}`
          });
        }
      } catch (error) {
        checks.push({
          status: 'warning',
          message: '⚠️ 无法检查消息限制',
          details: String(error)
        });
      }

      // 4. 检查是否是群主
      try {
        const mainOwner = await publicClient.readContract({
          address: groupAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'mainOwner',
              outputs: [{ internalType: 'address', name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'mainOwner'
        });

        const isOwner =
          mainOwner?.toString().toLowerCase() === currentAddress.toLowerCase();
        if (isOwner) {
          checks.push({
            status: 'success',
            message: '👑 你是群主',
            details: '群主拥有所有权限'
          });
        }
      } catch (error) {
        // 群主检查失败不影响结果
      }

      setResults(checks);
    } catch (error) {
      setResults([
        {
          status: 'error',
          message: '检查失败',
          details: String(error)
        }
      ]);
    } finally {
      setIsChecking(false);
    }
  };

  const hasErrors = results.some((r) => r.status === 'error');
  const allSuccess =
    results.length > 0 && results.every((r) => r.status === 'success');

  return (
    <div className={cn('space-y-3', className)}>
      <Button
        onClick={checkPermissions}
        disabled={isChecking}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            检查中...
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            检查发送权限
          </>
        )}
      </Button>

      {results.length > 0 && (
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border">
          {/* 总结 */}
          <div
            className={cn(
              'flex items-center gap-2 font-semibold pb-2 border-b',
              allSuccess && 'text-green-600',
              hasErrors && 'text-red-600'
            )}
          >
            {allSuccess && <CheckCircle className="w-5 h-5" />}
            {hasErrors && <XCircle className="w-5 h-5" />}
            {!allSuccess && !hasErrors && (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span>
              {allSuccess && '可以发送消息'}
              {hasErrors && '无法发送消息'}
              {!allSuccess && !hasErrors && '部分检查失败'}
            </span>
          </div>

          {/* 详细结果 */}
          {results.map((result, index) => (
            <div
              key={index}
              className={cn(
                'text-sm p-2 rounded',
                result.status === 'success' && 'bg-green-50 text-green-800',
                result.status === 'error' && 'bg-red-50 text-red-800',
                result.status === 'warning' && 'bg-yellow-50 text-yellow-800'
              )}
            >
              <div className="font-medium">{result.message}</div>
              {result.details && (
                <div className="text-xs mt-1 opacity-80">{result.details}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
