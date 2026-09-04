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

## Como manter suas alterações

- Produtos, quantidades, custos, reposições e anúncios são gravados no banco ao confirmar a ação. Aguarde a confirmação de salvamento antes de fechar a página.
- Se o servidor estiver indisponível, a interface informa o erro e não simula um salvamento apenas no navegador. O formulário permanece disponível para tentar novamente.
- Um catálogo vazio permanece vazio. Exemplos não são restaurados automaticamente após exclusões.
- Dados antigos do navegador podem ser importados pelo aviso de recuperação. Produtos com SKU já existente no banco não são substituídos por cópias antigas.
- Pedidos e entregas permitem cadastro, edição e exclusão no banco. Cadastre o pedido antes da entrega. Alterar o número de um pedido atualiza suas referências; para excluir o pedido, remova ou transfira suas entregas primeiro.
- Em **Produtos → Registrar venda**, o produto e o valor são preenchidos no pedido. Informe cliente, quantidade, destino e chegada prevista; confirme como **Pago**. O pedido e uma entrega **Não enviado** são gravados juntos. Também funciona ao mudar um pedido Pendente para Pago.
- Salvar novamente não duplica a entrega. Uma entrega excluída conscientemente não reaparece ao editar o pedido; para recriá-la, use **Nova entrega**. Entregas manuais existentes são preservadas.
- Em **Entregas → Editar**, use **Não enviado**, **A caminho** e **Entregue**. Registre as datas reais de envio e recebimento. A média usa dias corridos entre essas datas, excluindo registros sem datas e pedidos cancelados; o painel distingue a média geral da média para o mesmo endereço e da previsão informada no cadastro.
- Os estados antigos Preparando e Em trânsito são exibidos como Não enviado e A caminho. Datas antigas desconhecidas não são inventadas. Para gerar envio de um pedido antigo sem entrega, complete produto, destino e previsão ao editá-lo.
- Ainda não há sincronização Shopee ou transportadoras. O estoque e os indicadores da Visão geral continuam com controle manual. Cancelar um pedido não cancela o transporte: revise a entrega correspondente.
- Em Configurações, use as setas em **Organizar menu lateral** e confirme em **Salvar ordem**. Essa ordem é salva por administrador e aplicada ao menu do computador e do celular. **Restaurar ordem padrão** também precisa ser confirmado em **Salvar ordem**.
- O tema claro/escuro continua sendo uma preferência deste navegador.
- Use sempre a mesma pasta do projeto e preserve `.wrangler/state/v3/d1`. Fechar o site ou reiniciar o computador não apaga esse banco. Extrair outro ZIP em uma pasta nova não transfere seus dados automaticamente.
- Editar código no VS Code é diferente de editar um cadastro: no modo local estável, reinicie `npm run dev` para compilar o código atualizado. Para alterações de cadastros pelo site, não é necessário reiniciar.

O teste `npm run test:persistence` (após compilar) verifica gravação, fechamento, reabertura e exclusão usando somente um banco temporário.

## Verificações

```powershell
npm test
npm run lint
npx tsc --noEmit
```

Para gerar um build separado, encerre o servidor antes de executar `npm run build`, pois o Windows pode manter os arquivos de `dist` abertos.
