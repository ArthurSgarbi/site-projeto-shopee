import { clearSessionCookie, revokeSession } from '@/lib/auth';
import {
  assertSafeMutation,
  httpFailure,
  noStoreHeaders,
} from '@/lib/http-security';

export async function POST(request: Request) {
  try {
    assertSafeMutation(request);
    await revokeSession(request);
  } catch (error) {
    const failure = httpFailure(error);
    if (failure) return failure;
    // A sessão já expirada ainda deve ser removida do navegador.
  }
  return new Response(null, {
    status: 204,
    headers: { ...noStoreHeaders, 'Set-Cookie': clearSessionCookie(request) },
  });
}
