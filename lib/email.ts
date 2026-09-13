import { getEmailConfigurationError } from '@/lib/email-config';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[
        character
      ] ?? character,
  );
}

export async function sendLoginCodeEmail(recipient: string, code: string) {
  const configurationError = getEmailConfigurationError(
    process.env.RESEND_API_KEY,
  );
  if (configurationError) throw new Error(configurationError);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY?.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:
        process.env.EMAIL_FROM ?? 'SYNC Mobile <onboarding@resend.dev>',
      to: [recipient],
      subject: 'Seu código de acesso ao SYNC Mobile',
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#2b1916"><p style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#ee4d2d;font-weight:700">SYNC Mobile</p><h1 style="font-size:24px;margin:20px 0 8px">Confirme seu acesso</h1><p style="color:#765b55;line-height:1.6">Use o código abaixo para concluir seu login. Ele expira em 10 minutos.</p><div style="background:#fff0ec;border:1px solid #ffc7bb;border-radius:12px;padding:18px;text-align:center;margin:24px 0"><span style="font-size:34px;letter-spacing:.3em;font-weight:700;color:#d94122">${escapeHtml(code)}</span></div><p style="font-size:12px;color:#9a7770">Se você não tentou entrar no painel, ignore este e-mail.</p></div>`,
    }),
  }).catch((error: unknown) => {
    if (
      error instanceof Error &&
      ['TimeoutError', 'AbortError'].includes(error.name)
    ) {
      throw new Error('EMAIL_TIMEOUT');
    }
    throw new Error('EMAIL_SEND_FAILED');
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('EMAIL_RATE_LIMITED');
    if (response.status === 401 || response.status === 403) {
      const payload = (await response.json().catch(() => null)) as {
        name?: string;
      } | null;
      throw new Error(
        payload?.name === 'invalid_api_key' || response.status === 401
          ? 'EMAIL_INVALID_KEY'
          : 'EMAIL_SENDER_NOT_AUTHORIZED',
      );
    }
    throw new Error('EMAIL_SEND_FAILED');
  }
}
