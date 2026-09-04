import {
  discardLoginChallenge,
  LoginCooldownError,
  resendLoginChallenge,
} from '@/lib/auth';
import { sendLoginCodeEmail } from '@/lib/email';
import { httpFailure, noStoreHeaders, readJson } from '@/lib/http-security';

export async function POST(request: Request) {
  try {
    const body = (await readJson(request, 2_048)) as { challengeId?: unknown };
    if (typeof body.challengeId !== 'string' || !body.challengeId) {
      return Response.json(
        { error: 'Solicitação de código inválida.' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const challenge = await resendLoginChallenge(request, body.challengeId);
    if (!challenge) {
      return Response.json(
        {
          error:
            'Este código expirou. Volte e informe suas credenciais novamente.',
        },
        { status: 410, headers: noStoreHeaders },
      );
    }

    try {
      await sendLoginCodeEmail(challenge.email, challenge.code);
    } catch (error) {
      await discardLoginChallenge(challenge.challengeId).catch(() => undefined);
      console.error(
        '[auth/resend-code] Falha ao reenviar código.',
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
          error: `Aguarde ${error.retryAfterSeconds} segundos para reenviar.`,
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
      '[auth/resend-code] Falha inesperada.',
      error instanceof Error ? error.message : 'erro desconhecido',
    );
    return Response.json(
      { error: 'Não foi possível reenviar o código agora.' },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
