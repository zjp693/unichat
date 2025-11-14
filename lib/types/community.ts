// 群聊元数据
export interface CommunityMetadata {
  communityAddress: string;
  owner: string;
  topicToken: string;
  maxTier: number;
  name: string;
  avatarCid: string;
  currentEpoch: string;
}

// 用户 Proof 数据
export interface ProofData {
  maxTier: number;
  epoch: string;
  validUntil: string;
  nonce: string;
  proof: string[]; // Merkle Proof 数组
  leafHash: string;
}

// 用户群聊状态
export interface UserCommunityStatus {
  communityAddress: string;
  canJoin: boolean; // 是否有资格加入
  isJoined: boolean; // 是否已加入
  proofData: ProofData;
}

// 群聊列表 API 响应
export interface CommunitiesListResponse {
  success: boolean;
  data?: {
    communities: CommunityMetadata[];
    total: number;
  };
  error?: string;
  details?: string;
}

// 用户状态 API 响应
export interface UserStatusResponse {
  success: boolean;
  data?: {
    communities: UserCommunityStatus[];
  };
  error?: string;
  details?: string;
}

// 合并后的群聊数据（用于 UI 展示）
export interface CommunityWithStatus extends CommunityMetadata {
  canJoin: boolean;
  isJoined: boolean;
  proofData?: ProofData;
}
