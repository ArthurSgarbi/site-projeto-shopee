export const noStoreHeaders = {
  'Cache-Control': 'private, no-store',
  Pragma: 'no-cache',
};
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function assertSafeMutation(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  // SameSite sozinho não separa serviços em portas diferentes de localhost.
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    throw new HttpError(403, 'Origem não autorizada. Abra o site novamente.');
  }
}
export async function readJson(
  request: Request,
  maxBytes = 65_536,
): Promise<unknown> {
  assertSafeMutation(request);
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new HttpError(415, 'Envie os dados no formato JSON.');
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new HttpError(413, 'Dados excedem o tamanho permitido.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Dados inválidos.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, 'Dados excedem o tamanho permitido.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown;
  } catch {
    throw new HttpError(400, 'Dados inválidos.');
  }
}
export function httpFailure(error: unknown) {
  return error instanceof HttpError
    ? Response.json(
        { error: error.message },
        { status: error.status, headers: noStoreHeaders },
      )
    : null;
}
