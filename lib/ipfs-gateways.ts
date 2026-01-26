/**
 * IPFS 网关配置和管理
 * 支持多网关轮询和故障转移
 */

/**
 * IPFS 网关列表（按优先级排序）
 * 优先使用中国大陆可访问的网关
 */
export const IPFS_GATEWAYS = [
  //   'https://nftstorage.link/ipfs/', // NFT.Storage（中国大陆可访问）
  //   'https://w3s.link/ipfs/', // web3.storage
  //   'https://dweb.link/ipfs/', // IPFS基金会
  'https://apac.orbitor.dev/ipfs/', // Orbitor亚太节点
  'https://eu.orbitor.dev/ipfs/', // Orbitor欧洲节点
  'https://ipfs.orbitor.dev/ipfs/', // Orbitor通用节点
  'https://latam.orbitor.dev/ipfs/', // Orbitor拉美节点
  'https://gateway.pinata.cloud/ipfs/', // Pinata（可能被墙）
  'https://ipfs.io/ipfs/' // IPFS官方（中国大陆被墙）
] as const;

/**
 * 网关健康状态缓存
 */
interface GatewayHealth {
  gateway: string;
  lastSuccess: number; // 最后成功时间戳
  lastFailure: number; // 最后失败时间戳
  failureCount: number; // 连续失败次数
}

const gatewayHealthCache = new Map<string, GatewayHealth>();

/**
 * 初始化网关健康状态
 */
function initGatewayHealth(gateway: string): GatewayHealth {
  if (!gatewayHealthCache.has(gateway)) {
    gatewayHealthCache.set(gateway, {
      gateway,
      lastSuccess: 0,
      lastFailure: 0,
      failureCount: 0
    });
  }
  return gatewayHealthCache.get(gateway)!;
}

/**
 * 记录网关成功
 */
function recordGatewaySuccess(gateway: string) {
  const health = initGatewayHealth(gateway);
  health.lastSuccess = Date.now();
  health.failureCount = 0;
}

/**
 * 记录网关失败
 */
function recordGatewayFailure(gateway: string) {
  const health = initGatewayHealth(gateway);
  health.lastFailure = Date.now();
  health.failureCount++;
}

/**
 * 获取网关优先级分数（分数越高越优先）
 */
function getGatewayScore(gateway: string): number {
  const health = initGatewayHealth(gateway);
  const now = Date.now();

  // 如果最近失败次数过多，降低优先级
  if (health.failureCount >= 3) {
    // 失败后等待时间：5分钟
    const cooldownPeriod = 5 * 60 * 1000;
    if (now - health.lastFailure < cooldownPeriod) {
      return -1000; // 冷却期内，优先级最低
    }
    // 冷却期过后，重置失败计数
    health.failureCount = 0;
  }

  // 基础分数：最近成功的网关优先
  let score = 0;
  if (health.lastSuccess > 0) {
    const timeSinceSuccess = now - health.lastSuccess;
    // 1小时内成功过的网关加分
    if (timeSinceSuccess < 60 * 60 * 1000) {
      score += 100;
    }
  }

  // 失败次数扣分
  score -= health.failureCount * 10;

  return score;
}

/**
 * 获取排序后的网关列表（按健康状态排序）
 */
export function getSortedGateways(): string[] {
  return [...IPFS_GATEWAYS].sort((a, b) => {
    const scoreA = getGatewayScore(a);
    const scoreB = getGatewayScore(b);
    return scoreB - scoreA; // 降序排列
  });
}

/**
 * 从 IPFS CID 构建完整 URL
 * @param cid IPFS CID
 * @param gateway 网关 URL（可选，默认使用第一个可用网关）
 */
export function buildIPFSUrl(cid: string, gateway?: string): string {
  if (!cid) return '';

  // 如果已经是完整 URL，直接返回
  if (cid.startsWith('http://') || cid.startsWith('https://')) {
    return cid;
  }

  // 如果是相对路径，直接返回
  if (cid.startsWith('/')) {
    return cid;
  }

  // 移除 ipfs:// 前缀（如果有）
  const cleanCid = cid.replace(/^ipfs:\/\//, '').trim();

  // 如果 CID 为空，返回空字符串
  if (!cleanCid) return '';

  // 使用指定网关或第一个可用网关
  const selectedGateway = gateway || getSortedGateways()[0];
  return `${selectedGateway}${cleanCid}`;
}

/**
 * 尝试从单个网关获取资源
 */
async function tryFetchFromGateway(
  url: string,
  timeout: number = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'HEAD', // 只检查资源是否存在
      cache: 'no-cache'
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 从多个网关轮询获取 IPFS 资源
 * @param cid IPFS CID
 * @param options 配置选项
 * @returns 可用的 IPFS URL
 */
export async function getIPFSUrl(
  cid: string,
  options: {
    timeout?: number; // 单个网关超时时间（毫秒）
    maxRetries?: number; // 最大尝试网关数量
    onProgress?: (gateway: string, success: boolean, error?: string) => void;
  } = {}
): Promise<string> {
  const { timeout = 8000, maxRetries = 5, onProgress } = options;

  if (!cid) {
    throw new Error('CID 不能为空');
  }

  // 如果已经是完整 URL，直接返回
  if (cid.startsWith('http://') || cid.startsWith('https://')) {
    return cid;
  }

  // 如果是相对路径，直接返回
  if (cid.startsWith('/')) {
    return cid;
  }

  // 移除 ipfs:// 前缀
  const cleanCid = cid.replace(/^ipfs:\/\//, '');

  // 获取排序后的网关列表
  const gateways = getSortedGateways().slice(0, maxRetries);

  // 依次尝试每个网关
  for (const gateway of gateways) {
    const url = `${gateway}${cleanCid}`;

    try {
      onProgress?.(gateway, false);

      const response = await tryFetchFromGateway(url, timeout);

      if (response.ok) {
        recordGatewaySuccess(gateway);
        onProgress?.(gateway, true);
        return url;
      } else {
        recordGatewayFailure(gateway);
        onProgress?.(gateway, false, `HTTP ${response.status}`);
      }
    } catch (error) {
      recordGatewayFailure(gateway);
      const errorMsg = error instanceof Error ? error.message : '请求失败';
      onProgress?.(gateway, false, errorMsg);
    }
  }

  // 所有网关都失败，返回第一个网关的 URL（作为降级方案）
  const fallbackUrl = buildIPFSUrl(cleanCid, IPFS_GATEWAYS[0]);
  console.warn('⚠️ 所有 IPFS 网关都失败，使用降级 URL:', fallbackUrl);
  return fallbackUrl;
}

/**
 * 批量预热网关（可选，用于应用启动时）
 * 使用一个已知存在的 CID 测试所有网关
 */
export async function warmupGateways(
  testCid: string = 'QmPZ9gcCEpqKTo6aq61g2nXGUhM4iCL3ewB6LDXZCtioEB' // IPFS logo
): Promise<void> {
  const results = await Promise.allSettled(
    IPFS_GATEWAYS.map(async (gateway) => {
      const url = `${gateway}${testCid}`;
      try {
        const response = await tryFetchFromGateway(url, 5000);
        if (response.ok) {
          recordGatewaySuccess(gateway);
          return { gateway, success: true };
        } else {
          recordGatewayFailure(gateway);
          return { gateway, success: false };
        }
      } catch (error) {
        recordGatewayFailure(gateway);
        return { gateway, success: false };
      }
    })
  );

  const successCount = results.filter(
    (r) => r.status === 'fulfilled' && r.value.success
  ).length;
}
