'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Campaign } from '@/components/dashboard/types';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    signal: options.signal ?? AbortSignal.timeout(15_000),
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body &&
        typeof body === 'object' &&
        'error' in body &&
        typeof body.error === 'string'
        ? body.error
        : 'Não foi possível concluir a operação. Tente novamente.',
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

export function useCampaigns(onAction: (message: string) => void) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      setError('O servidor demorou para responder. Tente novamente.');
      setLoading(false);
    }, 15_000);
    request<Campaign[]>('/api/campaigns', { signal: controller.signal })
      .then((rows) => {
        if (!controller.signal.aborted) setCampaigns(rows);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar os anúncios. Tente novamente.',
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const mutate = useCallback(
    async (operation: () => Promise<void>, message: string) => {
      if (pending.current) return false;
      pending.current = true;
      setBusy(true);
      setError('');
      try {
        await operation();
        onAction(message);
        return true;
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Falha ao salvar. Tente novamente.',
        );
        return false;
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
    [onAction],
  );

  return {
    campaigns,
    loading,
    busy,
    error,
    retry: () => {
      setLoading(true);
      setError('');
      setAttempt((value) => value + 1);
    },
    clearError: () => setError(''),
    save: (values: Record<string, unknown>, id?: number) =>
      mutate(
        async () => {
          if (id !== undefined) {
            const updated = await request<Campaign>('/api/campaigns', {
              method: 'PUT',
              body: JSON.stringify({ ...values, id }),
            });
            setCampaigns((rows) =>
              rows.map((row) => (row.id === id ? updated : row)),
            );
          } else {
            const rows = await request<Campaign[]>('/api/campaigns', {
              method: 'POST',
              body: JSON.stringify(values),
            });
            setCampaigns(rows);
          }
        },
        id === undefined
          ? 'Campanha cadastrada no painel.'
          : 'Ajustes salvos no painel. A plataforma de anúncios não foi alterada.',
      ),
    remove: (id: number) =>
      mutate(async () => {
        await request<void>(`/api/campaigns?id=${id}`, { method: 'DELETE' });
        setCampaigns((rows) => rows.filter((row) => row.id !== id));
      }, 'Anúncio removido do SYNC Mobile.'),
    loadExamples: () =>
      mutate(async () => {
        setCampaigns(
          await request<Campaign[]>('/api/campaigns', {
            method: 'POST',
            body: JSON.stringify({ loadExamples: true }),
          }),
        );
      }, 'Exemplos demonstrativos carregados.'),
  };
}
