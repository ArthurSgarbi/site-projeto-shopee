import {
  createLoginChallenge,
  discardLoginChallenge,
  LoginCooldownError,
} from '@/lib/auth';
import { sendLoginCodeEmail } from '@/lib/email';
import { httpFailure, noStoreHeaders, readJson } from '@/lib/http-security';

export async function POST(request: Request) {
  try {
    const body = (await readJson(request, 4_096)) as {
      email?: unknown;
      password?: unknown;
    };
    if (
      typeof body.email !== 'string' ||
      typeof body.password !== 'string' ||
      !body.email.trim() ||
      body.email.length > 254 ||
      !body.password ||
      body.password.length > 128
    ) {
      return Response.json(
        { error: 'Informe seu e-mail e senha.' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const challenge = await createLoginChallenge(
      request,
      body.email,
      body.password,
    );
    if (!challenge)
      return Response.json(
        { error: 'E-mail ou senha inválidos.' },
        { status: 401, headers: noStoreHeaders },
      );
    try {
      await sendLoginCodeEmail(challenge.email, challenge.code);
    } catch (error) {
      await discardLoginChallenge(challenge.challengeId).catch(() => undefined);
      console.error(
        '[auth/login] Falha ao enviar código de acesso.',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
      return Response.json(
        { error: 'Não foi possível enviar o código agora. Tente mais tarde.' },
        { status: 503, headers: noStoreHeaders },
      );
    }
    return Response.json(
      {
        challengeId: challenge.challengeId,
        maskedEmail: challenge.maskedEmail,
        expiresInSeconds: challenge.expiresInSeconds,
      },
      { headers: { ...noStoreHeaders, 'Set-Cookie': challenge.cookie } },
    );
  } catch (error) {
    const failure = httpFailure(error);
    if (failure) return failure;
    if (error instanceof LoginCooldownError) {
      return Response.json(
        {
          error: `Aguarde ${error.retryAfterSeconds} segundos para solicitar outro código.`,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...noStoreHeaders,
            'Retry-After': String(error.retryAfterSeconds),
          },
        },
      );
    }
    console.error(
      '[auth/login] Falha ao iniciar autenticação.',
      error instanceof Error ? error.message : 'erro desconhecido',
    );
    return Response.json(
      { error: 'Não foi possível realizar o login agora.' },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
