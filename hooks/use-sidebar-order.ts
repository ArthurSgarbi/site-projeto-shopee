'use client';

import { useEffect, useRef, useState } from 'react';
import type { SectionKey } from '@/components/dashboard/types';
import { DEFAULT_SIDEBAR_ORDER, isSidebarOrder } from '@/lib/navigation';
import { recordsRequest } from '@/lib/records-client';

export function useSidebarOrder(adminId: number | null) {
  const [saved, setSaved] = useState<{
    adminId: number;
    order: SectionKey[];
  } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    if (adminId === null) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let mounted = true;
    recordsRequest<{ sidebarOrder: SectionKey[] }>('/api/preferences', {
      signal: controller.signal,
    })
      .then((data) => {
        if (!isSidebarOrder(data.sidebarOrder))
          throw new Error('A ordem salva é inválida. Tente novamente.');
        if (mounted) {
          setSaved({ adminId, order: data.sidebarOrder });
          setError('');
        }
      })
      .catch((error: unknown) => {
        if (mounted)
          setError(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar o menu.',
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      mounted = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [adminId, attempt]);

  return {
    order: saved?.adminId === adminId ? saved.order : DEFAULT_SIDEBAR_ORDER,
    ready: adminId !== null && saved?.adminId === adminId,
    busy,
    error,
    retry: () => {
      setError('');
      setAttempt((value) => value + 1);
    },
    save: async (order: SectionKey[]) => {
      if (adminId === null || pending.current || !isSidebarOrder(order))
        return false;
      pending.current = true;
      setBusy(true);
      setError('');
      try {
        const data = await recordsRequest<{ sidebarOrder: SectionKey[] }>(
          '/api/preferences',
          { method: 'PUT', body: JSON.stringify({ sidebarOrder: order }) },
        );
        setSaved({ adminId, order: data.sidebarOrder });
        return true;
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o menu.',
        );
        return false;
      } finally {
        pending.current = false;
        setBusy(false);
      }
    },
  };
}
