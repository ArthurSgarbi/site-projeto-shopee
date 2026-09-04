# Segurança do SYNC Mobile

## Proteções aplicadas

- Senhas são derivadas com PBKDF2-HMAC-SHA-256 e salt aleatório; hashes antigos são atualizados somente depois de um login válido.
- O segundo fator usa código aleatório, expira em 10 minutos, aceita no máximo 5 tentativas e 3 reenvios e fica vinculado ao navegador que iniciou o login.
- Trocar ou reenviar o código invalida o anterior de forma atômica. Requisições paralelas não ganham tentativas extras.
- Cookies são `HttpOnly`, `SameSite=Strict` e recebem `Secure` sob HTTPS. O banco guarda apenas o SHA-256 do token de sessão.
- Sessões exigem MFA, duram no máximo 8 horas e expiram depois de 30 minutos sem atividade.
- APIs verificam sessão no servidor, origem da requisição, formato e tamanho do corpo. Respostas privadas não são armazenadas em cache.
- CSP com nonce, proteção contra iframe, `nosniff`, política de referência e permissões restritas reduzem ataques no navegador.
- Arquivos de ambiente, bancos locais, artefatos privados e source maps não são publicados nem devem entrar no Git.

As escolhas seguem as recomendações atuais da [OWASP para senhas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [sessões](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) e [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Ações obrigatórias do proprietário

1. Revogue qualquer chave da Resend que tenha aparecido em imagem, chat ou repositório e crie outra no painel da Resend.
2. Entre no painel, abra **Configurações > Segurança da conta** e troque a senha por uma exclusiva de pelo menos 12 caracteres.
3. Depois de comprovar o novo login, remova `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` de `.dev.vars`. A conta continuará no banco.
4. Nunca envie `.dev.vars`, `.wrangler`, bancos SQLite ou ZIPs que contenham esses arquivos.
5. Ao publicar o sistema, use HTTPS, um provedor de segredos e backups criptografados. O login do site não protege arquivos contra outra pessoa que já tenha acesso à mesma conta do Windows.

Nenhum sistema é inviolável. Dependências devem continuar atualizadas, e mudanças em autenticação precisam repetir os testes de segurança.
