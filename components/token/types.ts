/**
 * Token 相关类型定义
 */

export interface Token {
  address: string;
  symbol: string;
  name: string;
  iconCid?: string; // IPFS CID（推荐代币有，自定义代币无）
  decimals: number;
  balance?: string; // 用户余额（格式化后）
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedToken?: Token | null; // 当前选中的代币对象
  onSelectToken: (token: Token) => void;
}

export interface TokenSearchBarProps {
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  onAddClick: () => void;
}

export interface TokenListProps {
  tokens: Token[];
  selectedToken?: Token | null; // 当前选中的代币对象
  onSelect: (token: Token) => void;
}

export interface TokenListItemProps {
  token: Token;
  isSelected?: boolean;
  onClick: () => void;
}

export interface TokenEmptyStateProps {
  onAddClick: () => void;
}

export interface AddTokenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (token: Token) => void;
}
