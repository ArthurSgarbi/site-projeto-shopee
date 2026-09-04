'use client';

import { useEffect, useRef, useState } from 'react';
import { recordsRequest } from '@/lib/records-client';

export function useRecords<T extends { id: number }, Draft = Omit<T, 'id'>>(
  endpoint: string,
  onAction?: (message: string) => void,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let mounted = true;
    recordsRequest<T[]>(endpoint, { signal: controller.signal })
      .then((data) => {
        if (mounted) setRows(data);
      })
      .catch((error: unknown) => {
        if (mounted)
          setLoadError(
            error instanceof Error ? error.message : 'Falha ao carregar.',
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, attempt]);

  async function mutate(operation: () => Promise<void>, message: string) {
    if (pending.current || loading || loadError) return false;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await operation();
      onAction?.(message);
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar. Tente novamente.',
      );
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return {
    rows,
    loading,
    loadError,
    busy,
    error,
    clearError: () => setError(''),
    retry: () => {
      setLoading(true);
      setLoadError('');
      setError('');
      setAttempt((value) => value + 1);
    },
    save: (values: Draft, id?: number) =>
      mutate(async () => {
        const saved = await recordsRequest<T>(endpoint, {
          method: id === undefined ? 'POST' : 'PUT',
          body: JSON.stringify({
            ...values,
            ...(id === undefined ? {} : { id }),
          }),
        });
        setRows((current) =>
          id === undefined
            ? [saved, ...current]
            : current.map((row) => (row.id === id ? saved : row)),
        );
      }, 'Registro salvo no banco.'),
    remove: (id: number) =>
      mutate(async () => {
        await recordsRequest<void>(`${endpoint}?id=${id}`, {
          method: 'DELETE',
        });
        setRows((current) => current.filter((row) => row.id !== id));
      }, 'Registro excluído do painel.'),
  };
}
