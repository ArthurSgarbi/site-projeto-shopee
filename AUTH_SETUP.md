# Código de acesso por e-mail

O login do SYNC Mobile usa duas etapas:

1. e-mail e senha do administrador;
2. código de 6 dígitos enviado ao mesmo e-mail.

O código expira em 10 minutos, permite cinco tentativas e só pode ser usado uma vez.

## Ativar o envio real

O projeto está integrado à API da Resend. Para ativar o envio local:

1. Crie uma conta em [resend.com](https://resend.com) e gere uma API key.
2. Copie `.dev.vars.example` para `.dev.vars` no computador. Na Vercel, use **Settings > Environment Variables**.
3. Preencha `RESEND_API_KEY` com uma chave real da Resend, começando com `re_`. Uma chave do Gemini/Google não autentica o serviço da Resend.
4. Para testes, mantenha `onboarding@resend.dev` no campo `EMAIL_FROM`. Para produção, use um remetente de domínio verificado na Resend.
5. Com `onboarding@resend.dev`, o destinatário deve ser o mesmo e-mail usado na sua conta Resend. Para outras pessoas, use um domínio verificado e seu remetente autorizado.
6. Reinicie o servidor local com `npm run dev` ou publique novamente a versão da Vercel.

## Criar o primeiro administrador

Se o banco estiver vazio, defina também `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` no arquivo `.dev.vars` ou nas variáveis privadas da Vercel. No primeiro login válido, o administrador será criado com acesso total. Depois disso, a senha fica armazenada somente como hash PBKDF2 no banco. Remova essas duas variáveis após confirmar o primeiro acesso.

O servidor aplica as migrações automaticamente ao executar `npm run dev`. Aguarde aparecer `SYNC Mobile disponível` antes de abrir a página. O reenvio do código possui um intervalo de 60 segundos para impedir disparos repetidos.

O arquivo `.dev.vars.example` é somente um modelo: editar apenas esse arquivo não configura o serviço. Não compartilhe chaves por chat nem as coloque em componentes React. Se alguma chave foi publicada, revogue-a no serviço que a emitiu.

Os arquivos `.dev.vars` e `.env.local` são ignorados pelo Git para que as chaves não sejam publicadas.
