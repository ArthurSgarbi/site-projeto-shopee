import { getSessionAdmin } from '@/lib/auth';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const admin = await getSessionAdmin(request);
    if (!admin)
      return Response.json(
        { authenticated: false },
        { status: 401, headers: noStoreHeaders },
      );
    return Response.json(
      { authenticated: true, admin },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error(
      '[auth/session] Falha ao consultar sessão.',
      error instanceof Error ? error.message : 'erro desconhecido',
    );
    return Response.json(
      { authenticated: false },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
