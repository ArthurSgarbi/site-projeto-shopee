export type EmailFailureCode =
  | 'EMAIL_NOT_CONFIGURED'
  | 'EMAIL_WRONG_PROVIDER'
  | 'EMAIL_INVALID_KEY'
  | 'EMAIL_SENDER_NOT_AUTHORIZED'
  | 'EMAIL_RATE_LIMITED'
  | 'EMAIL_TIMEOUT'
  | 'EMAIL_SEND_FAILED';

export function getEmailConfigurationError(
  key: string | undefined,
): EmailFailureCode | null {
  const value = key?.trim();
  if (!value) return 'EMAIL_NOT_CONFIGURED';
  if (!value.startsWith('re_')) return 'EMAIL_WRONG_PROVIDER';
  if (/^re_x+$/i.test(value)) return 'EMAIL_INVALID_KEY';
  return null;
}

const emailFailureMessages: Record<EmailFailureCode, string> = {
  EMAIL_NOT_CONFIGURED:
    'O envio de e-mail ainda não está configurado. Preencha RESEND_API_KEY no arquivo .dev.vars e reinicie o servidor.',
  EMAIL_WRONG_PROVIDER:
    'A chave informada não é da Resend. Chaves do Gemini/Google não enviam os códigos deste site. Use uma chave Resend em RESEND_API_KEY e reinicie o servidor.',
  EMAIL_INVALID_KEY:
    'A chave da Resend é inválida ou ainda é um exemplo. Gere uma chave real na Resend, atualize .dev.vars e reinicie o servidor.',
  EMAIL_SENDER_NOT_AUTHORIZED:
    'A Resend não autorizou este envio. Com onboarding@resend.dev, use o mesmo e-mail da sua conta Resend. Para outros destinatários, configure um domínio verificado.',
  EMAIL_RATE_LIMITED:
    'O serviço de e-mail atingiu um limite de envio. Aguarde e tente novamente.',
  EMAIL_TIMEOUT:
    'O serviço de e-mail demorou para responder. Confira sua conexão e tente novamente.',
  EMAIL_SEND_FAILED:
    'Não foi possível enviar o código. Tente novamente em instantes.',
};

export function getEmailFailureMessage(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  return Object.hasOwn(emailFailureMessages, code)
    ? emailFailureMessages[code as EmailFailureCode]
    : emailFailureMessages.EMAIL_SEND_FAILED;
}
