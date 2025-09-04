import { useEffect, useRef, useState } from 'react';
import { useReadContract } from 'wagmi';
import { prepareCelebrityContractCall, type CelebrityFromContract, createCelebrityContractHooks } from './contacts';

interface UseCelebrityPaginationOptions {
  pageSize?: number;
  activeOnly?: boolean;
  enabled?: boolean;
}

export function useCelebrityPagination(options: UseCelebrityPaginationOptions = {}) {
  const { pageSize = 10, activeOnly = false, enabled = true } = options;
  const { processContractData } = createCelebrityContractHooks();

  const [page, setPage] = useState(0);
  const [rawPages, setRawPages] = useState<CelebrityFromContract[][]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  // read current page using wagmi; arguments change when page changes
  const callArgs = prepareCelebrityContractCall({ page, pageSize, activeOnly });
  // We rely on enabled flag inside prepare function + outer enabled
  const { data, isLoading, error, refetch } = useReadContract({ ...callArgs, query: { ...(callArgs.query || {}), enabled: enabled && !!callArgs.address } } as any);

  // When page data returns, append or replace accordingly
  useEffect(() => {
    if (!data) return;
    const pageData = data as CelebrityFromContract[];

    setRawPages((prev) => {
      // replace if page already present
      const next = [...prev];
      next[page] = pageData;
      return next;
    });

    // 判断是否还有更多
    if (pageData.length < pageSize) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }

    setIsLoadingMore(false);
    loadingRef.current = false;
  }, [data, page, pageSize]);

  // Derived processed contacts
  const celebrities = rawPages.flat().map((c, idx) => processContractData([c])[0]).filter(Boolean);

  // load next page
  const loadNext = async () => {
    if (loadingRef.current) return;
    if (!hasMore) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    setPage((p) => p + 1);
  };

  // reset pagination
  const reset = () => {
    loadingRef.current = false;
    setPage(0);
    setRawPages([]);
    setHasMore(true);
  };

  return {
    celebrities,
    rawPages,
    page,
    pageSize,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refetch,
    loadNext,
    reset,
    setPage,
  } as const;
}
