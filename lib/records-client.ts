export async function recordsRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(
      'O servidor não respondeu. Verifique a conexão e atualize a lista antes de tentar novamente.',
    );
  }
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
