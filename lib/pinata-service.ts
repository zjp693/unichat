import { PinataSDK } from 'pinata';

// 导入CID映射
import { filenameToCidMap, cidToFilenameMap } from './pinata-cid-map';

// 文件缓存
export const fileCache = new Map<string, any>();

// 创建Pinata SDK实例
export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL
});

/**
 * 从Pinata读取文件数据（带缓存）
 * @param cid Pinata文件的CID或IPFS路径
 * @returns JSON解析后的数据
 */
export async function getPinataFileWithCache(cid: string) {
  try {
    // 检查缓存
    if (fileCache.has(cid)) {
      return fileCache.get(cid);
    }

    // 添加重试机制
    let retries = 3;
    let jsonData = null;

    while (retries > 0) {
      try {
        // 设置超时和中止控制器
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

        // 构建URL
        // 检查cid是否包含文件路径（如"CID/filename.json"）
        const url = cid.includes('/')
          ? `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}/ipfs/${cid}`
          : `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}/ipfs/${cid}`;

        // 获取文件内容
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache'
          }
        });

        // 清除超时
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }

        // 使用流式处理，避免一次性加载大文件
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let chunks = [];
        let receivedLength = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          chunks.push(value);
          receivedLength += value.length;

          // 显示下载进度
          //   console.log(`已接收 ${receivedLength} 字节数据`);

          // 如果文件太大，可能需要考虑其他方案
          if (receivedLength > 500 * 1024 * 1024) {
            // 500MB
            throw new Error('文件太大，无法处理');
          }
        }

        // 合并块
        let chunksAll = new Uint8Array(receivedLength);
        let position = 0;
        for (let chunk of chunks) {
          chunksAll.set(chunk, position);
          position += chunk.length;
        }

        // 转换为文本
        const decoder = new TextDecoder('utf-8');
        const jsonText = decoder.decode(chunksAll);

        // 解析JSON
        jsonData = JSON.parse(jsonText);

        // 成功获取数据，跳出循环
        break;
      } catch (innerError: any) {
        console.warn(
          `Pinata读取失败 (${cid}), 重试剩余: ${retries}`,
          innerError
        );
        retries--;

        // 如果所有重试都失败了，抛出最后一个错误
        if (retries === 0) {
          throw innerError;
        }

        // 等待一段时间再重试
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // 存入缓存
    fileCache.set(cid, jsonData);

    return jsonData;
  } catch (error: any) {
    console.error(`Pinata访问错误 (${cid}):`, error.message);
    throw error;
  }
}

/**
 * 创建文件下载链接
 * @param cid 文件的CID
 * @returns 签名的URL
 */
export async function createPinataDownloadLink(cid: string) {
  try {
    // 构建正确的网关URL，支持文件夹内文件的路径格式
    const gatewayURL = `https://${process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL}/ipfs/${cid}`;

    // 日志记录创建的URL

    return gatewayURL;
  } catch (error) {
    console.error(`创建下载链接失败 (${cid}):`, error);
    throw error;
  }
}
