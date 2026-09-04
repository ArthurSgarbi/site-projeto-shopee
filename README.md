# SYNC Mobile

Painel local de estoque e gestão da loja com autenticação em duas etapas.

## Abrir no Windows / VS Code

1. Instale Node.js 22.13 ou superior.
2. Extraia o ZIP e abra a pasta `SYNC-Mobile` no VS Code. É a pasta que contém `package.json`.
3. No terminal dessa pasta, execute `npm ci` uma vez para instalar as dependências.
4. Copie `.dev.vars.example` para `.dev.vars` e preencha a chave da **Resend**, o remetente e, se o banco for novo, o e-mail/senha do primeiro administrador. Não use uma chave do Gemini. Veja `AUTH_SETUP.md`.
5. Execute `npm run dev`.
6. Aguarde a mensagem `SYNC Mobile disponível em http://127.0.0.1:3000/` e abra esse endereço.

```powershell
npm ci
npm run dev
```

## Como funciona o modo local

`npm run dev` e `npm start` usam a mesma inicialização estável: verificam a porta, aplicam migrações, compilam a interface inteira e iniciam o servidor local com os arquivos JavaScript e CSS corretos.

Esse modo não usa atualização automática (HMR). Depois de alterar o código ou `.dev.vars`, encerre com Ctrl+C e execute o comando novamente. Isso evita a compilação sob demanda que demorou para responder neste ambiente Windows.

O modo de desenvolvimento original com HMR continua disponível para uso avançado:

```powershell
npm run dev:hmr
```

Se a porta 3000 já estiver ocupada, encerre somente a outra instância deste site ou escolha outra porta:

```powershell
npm run dev -- --port 3002
```

O programa não encerra outros processos automaticamente. Uma chave de e-mail ausente ou incorreta não impede o site de abrir, mas impede a conclusão do login: a etapa de código continua obrigatória.

## Banco de dados e segurança

O ZIP inclui código, imagens, migrações e exemplos. Não inclui `.dev.vars`, senhas, sessões, cadastros reais, `.wrangler`, `dist` ou `node_modules`.

Em uma pasta extraída nova, o banco estará vazio: configure `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` em `.dev.vars`. O primeiro login válido cria o administrador. Seus dados locais ficam em `.wrangler/state/v3/d1`; preserve essa pasta no projeto original e mantenha backups privados dela. Não publique esse diretório nem `.dev.vars`.

## Verificações

```powershell
npm test
npm run lint
npx tsc --noEmit
```

Para gerar um build separado, encerre o servidor antes de executar `npm run build`, pois o Windows pode manter os arquivos de `dist` abertos.
