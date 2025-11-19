/**
 * Pinata 上传工具函数
 * 用于上传头像和 NFT metadata 到 IPFS
 * 使用 Pinata 公共网关: https://gateway.pinata.cloud/ipfs/<CID>
 */

// 客户端必须使用 NEXT_PUBLIC_ 前缀的环境变量
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

if (!PINATA_JWT) {
  console.error('❌ NEXT_PUBLIC_PINATA_JWT 环境变量未设置');
  console.error(
    '请在 .env.local 中添加: NEXT_PUBLIC_PINATA_JWT=your_jwt_token'
  );
}

/**
 * 上传图片文件到 Pinata
 * @param file 图片文件
 * @returns IPFS CID
 */
export async function uploadImageToPinata(file: File): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT 未配置，无法上传文件');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: `avatar-${Date.now()}`
    });
    formData.append('pinataMetadata', metadata);

    console.log('🔑 使用 JWT 上传图片到 Pinata...');

    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`上传失败: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ 图片上传成功，CID:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('❌ 上传图片到 Pinata 失败:', error);
    throw error;
  }
}

/**
 * 上传 JSON metadata 到 Pinata
 * @param metadata NFT metadata 对象
 * @returns IPFS CID
 */
export async function uploadMetadataToPinata(
  metadata: Record<string, any>
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT 未配置，无法上传 metadata');
  }

  try {
    console.log('🔑 使用 JWT 上传 metadata 到 Pinata...');
    console.log('📦 Metadata:', metadata);

    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_JWT}`
        },
        body: JSON.stringify(metadata)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Pinata API 错误:', error);
      throw new Error(`上传失败: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Metadata 上传成功，CID:', data.IpfsHash);
    return data.IpfsHash;
  } catch (error) {
    console.error('❌ 上传 metadata 到 Pinata 失败:', error);
    throw error;
  }
}

/**
 * 创建 NFT metadata 对象
 * @param name 用户昵称
 * @param description 个人简介
 * @param avatarCid 头像 IPFS CID
 * @returns metadata 对象
 */
export function createNFTMetadata(
  name: string,
  description: string,
  avatarCid: string
) {
  const imageUrl = avatarCid
    ? `https://gateway.pinata.cloud/ipfs/${avatarCid}`
    : '';

  let metadata: Record<string, any> = {
    name: name,
    image: imageUrl
  };

  // 只有当 description 有值时才添加
  if (description && description.trim()) {
    metadata.description = description;
  }

  return metadata;
}

/**
 * 获取 IPFS 网关 URL
 * @param cid IPFS CID
 * @returns 完整的网关 URL
 */
export function getIPFSUrl(cid: string): string {
  if (!cid) return '';
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}
