/**
 * Web3 模块统一导出
 */

// 网络相关
export {
  networks,
  arbitrum,
  opBNB,
  SUPPORTED_CHAIN_IDS,
  isSupportedChainId,
  getNetworkById,
  arbitrumRpcUrls,
  opBNBRpcUrls,
  type SupportedChainId
} from './networks';

// 合约相关
export {
  CONTRACTS,
  getContractAddress,
  getChainContracts,
  isValidContractAddress,
  getExplorerContractUrl,
  getExplorerTxUrl,
  type ContractName,
  type ChainContracts
} from './contracts';

// Hooks
export {
  useActiveContracts,
  useContractAddress,
  useCurrentChainId,
  useIsSupportedChain
} from './hooks/useActiveContracts';
