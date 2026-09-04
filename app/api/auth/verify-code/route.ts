import { verifyLoginCode } from '@/lib/auth';
import { httpFailure, noStoreHeaders, readJson } from '@/lib/http-security';

export async function POST(request: Request) {
  try {
    const body = (await readJson(request, 2_048)) as {
      challengeId?: unknown;
      code?: unknown;
    };
    if (typeof body.challengeId !== 'string' || typeof body.code !== 'string')
      return Response.json(
        { error: 'Informe o código recebido por e-mail.' },
        { status: 400, headers: noStoreHeaders },
      );
    const result = await verifyLoginCode(
      request,
      body.challengeId,
      body.code.trim(),
    );
    if (result.status === 'ok')
      return Response.json(
        { admin: result.session.admin },
        { headers: { ...noStoreHeaders, 'Set-Cookie': result.session.cookie } },
      );
    if (result.status === 'expired')
      return Response.json(
        { error: 'Este código expirou. Solicite um novo código.' },
        { status: 410, headers: noStoreHeaders },
      );
    if (result.status === 'locked')
      return Response.json(
        { error: 'Muitas tentativas. Solicite um novo código.' },
        { status: 429, headers: noStoreHeaders },
      );
    return Response.json(
      { error: 'Código incorreto. Confira o e-mail e tente novamente.' },
      { status: 401, headers: noStoreHeaders },
    );
  } catch (error) {
    const failure = httpFailure(error);
    if (failure) return failure;
    console.error(
      '[auth/verify-code] Falha ao validar código.',
      error instanceof Error ? error.message : 'erro desconhecido',
    );
    return Response.json(
      { error: 'Não foi possível validar o código agora.' },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
