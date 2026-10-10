'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, getApiError } from '../lib/api';
import { ApiResponse, Pagination } from '../types';
import { useDebouncedValue } from './useDebouncedValue';

/** GETs `path` (skipped while null) and exposes data / loading / error / reload. */
export function useApiData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(path !== null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setIsLoading(true);
    api
      .get<ApiResponse<T>>(path)
      .then((res) => {
        if (cancelled) return;
        setData(res.data.data ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, error, isLoading, reload };
}

/**
 * Server-paginated, debounced-search list. Changing the search text or a filter resets
 * to page 1 without issuing an extra request for the stale page; out-of-order responses
 * are ignored.
 */
export function usePaginatedList<T>(path: string, filters: Record<string, string | undefined> = {}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const filtersKey = JSON.stringify(filters);
  const queryKey = `${debouncedSearch}|${filtersKey}`;
  const [pageState, setPageState] = useState({ key: queryKey, page: 1 });
  const page = pageState.key === queryKey ? pageState.page : 1;

  const [items, setItems] = useState<T[]>([]);
  const [meta, setMeta] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const params = {
      page,
      limit: 10,
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(JSON.parse(filtersKey) as Record<string, string | undefined>),
    };
    api
      .get<ApiResponse<T[]>>(path, { params })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data.data ?? []);
        setMeta(res.data.pagination ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, page, filtersKey, debouncedSearch, reloadKey]);

  return {
    items,
    meta,
    isLoading,
    error,
    search,
    setSearch,
    setPage: (p: number) => setPageState({ key: queryKey, page: p }),
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
  };
}
