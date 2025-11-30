'use client';

import { TokenListItem } from './TokenListItem';
import type { TokenListProps } from './types';

export function TokenList({ tokens, selectedToken, onSelect }: TokenListProps) {
  if (tokens.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="flex flex-col">
        {tokens.map((token) => (
          <div key={token.address}>
            <TokenListItem
              token={token}
              isSelected={
                token.address.toLowerCase() ===
                selectedToken?.address.toLowerCase()
              }
              onClick={() => onSelect(token)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
