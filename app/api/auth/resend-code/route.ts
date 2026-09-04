import {
  discardLoginChallenge,
  LoginCooldownError,
  resendLoginChallenge,
} from '@/lib/auth';
import { sendLoginCodeEmail } from '@/lib/email';
import { getEmailFailureMessage } from '@/lib/email-config';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { challengeId?: unknown };
    if (typeof body.challengeId !== 'string' || !body.challengeId) {
      return Response.json(
        { error: 'Solicitação de código inválida.' },
        { status: 400, headers: noStoreHeaders },
      );
    }

    const challenge = await resendLoginChallenge(body.challengeId);
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
        { error: getEmailFailureMessage(error) },
        { status: 503, headers: noStoreHeaders },
      );
    }

    await discardLoginChallenge(body.challengeId).catch((error) => {
      console.error(
        '[auth/resend-code] Falha ao invalidar código anterior.',
        error instanceof Error ? error.message : 'erro desconhecido',
      );
    });

    return Response.json(
      {
        challengeId: challenge.challengeId,
        maskedEmail: challenge.maskedEmail,
        expiresInSeconds: 600,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
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
