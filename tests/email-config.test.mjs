import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEmailConfigurationError,
  getEmailFailureMessage,
} from '../lib/email-config.ts';

await test('configuração ausente ou em branco bloqueia o envio', () => {
  assert.equal(getEmailConfigurationError(undefined), 'EMAIL_NOT_CONFIGURED');
  assert.equal(getEmailConfigurationError('  '), 'EMAIL_NOT_CONFIGURED');
});

await test('chave de outro serviço é rejeitada antes de qualquer envio', () => {
  assert.equal(
    getEmailConfigurationError('AIza-exemplo-ficticio'),
    'EMAIL_WRONG_PROVIDER',
  );
  assert.equal(
    getEmailConfigurationError('chave-de-outro-servico'),
    'EMAIL_WRONG_PROVIDER',
  );
  assert.match(
    getEmailFailureMessage(new Error('EMAIL_WRONG_PROVIDER')),
    /Gemini/,
  );
});

await test('valor de exemplo é rejeitado; prefixo Resend é somente uma validação de formato', () => {
  assert.equal(getEmailConfigurationError('re_xxxxxxxxx'), 'EMAIL_INVALID_KEY');
  assert.equal(
    getEmailConfigurationError(' re_exemplo-ficticio-para-testar-formato '),
    null,
  );
});

await test('mensagens desconhecidas nunca vazam detalhes privados do provedor', () => {
  const message = getEmailFailureMessage(
    new Error('detalhe-privado-que-nao-deve-aparecer'),
  );
  assert.equal(message.includes('privado'), false);
  assert.match(message, /Não foi possível enviar/);
  assert.match(
    getEmailFailureMessage(new Error('EMAIL_SENDER_NOT_AUTHORIZED')),
    /mesmo e-mail/,
  );
  assert.match(getEmailFailureMessage(new Error('EMAIL_TIMEOUT')), /demorou/);
});
