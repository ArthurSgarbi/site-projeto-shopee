import { clearSessionCookie, revokeSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await revokeSession(request);
  } catch {
    // A sessão já expirada ainda deve ser removida do navegador.
  }
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': clearSessionCookie(request) },
  });
}
