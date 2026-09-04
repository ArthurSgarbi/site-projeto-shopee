import type { Product } from '../components/dashboard/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function normalizeProduct(product: Product): Product {
  return {
    ...product,
    weeklyAdSpendCents: product.weeklyAdSpendCents ?? 0,
    weeklyAdRevenueCents: product.weeklyAdRevenueCents ?? 0,
  };
}

export async function productRequest<T>(
  options: RequestInit = {},
  suffix = '',
): Promise<T> {
  const response = await fetch(`/api/products${suffix}`, {
    ...options,
    cache: 'no-store',
    signal: options.signal ?? AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new ApiError(
      response.status,
      payload?.error ?? 'O banco não confirmou a operação. Tente novamente.',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function loadProducts(signal?: AbortSignal) {
  const rows = await productRequest<Product[]>({ signal });
  if (!Array.isArray(rows)) throw new Error('Resposta de estoque inválida.');
  // Um banco vazio é um resultado válido. Nunca repor exemplos automaticamente.
  return rows.map(normalizeProduct);
}

export async function persistProduct(product: Product, method: 'POST' | 'PUT') {
  return normalizeProduct(
    await productRequest<Product>({ method, body: JSON.stringify(product) }),
  );
}
