# Custos da Cozinha (web)

Web app de custos de cozinha que roda **100% no plano gratuito (Spark)** do Firebase,
usando Hosting, Firestore e Authentication. Não usa servidor próprio, Cloud Functions,
Cloud Run nem faturamento.

## Segurança: leia isto primeiro

- A configuração em `src/firebase-config.js` (apiKey, projectId etc.) **não é segredo**.
  Ela vai dentro do site para o navegador de qualquer pessoa. Por isso pode ficar no código.
- **Quem protege os dados são as Security Rules** (`firestore.rules`). Se as rules
  estiverem abertas, qualquer pessoa com a config consegue ler e apagar tudo.
  Nunca publique `allow read, write: if true`.
- Nunca coloque no repositório chaves de *service account* (arquivos `.json` de conta de
  serviço), senhas ou tokens.

## Security Rules (`firestore.rules`)

- Só a conta do dono (UID `tPaDPlz9bsX9gZAfx6d0LkrPGSN2`, fixo na regra) lê e escreve.
  Outra conta, mesmo logada, e visitantes sem login **não veem nada**.
- Coleções fora da lista (recipientes, alimentos, configuracao, saidas, sobras,
  observacoes_dia, gastos) são negadas até para o dono.
- Cada gravação confere os campos exatos, os tipos (valores como **string** decimal com
  ponto, nunca number), os limites (preço > 0, tara e taxa ≥ 0, valor com até 2 casas),
  o formato das datas `AAAA-MM-DD` e as formas de pagamento permitidas.
- `sobras/{id}` só pode ser criada se `saidas/{id}` existir. Uma saída só pode ser apagada
  junto com a sobra dela, no mesmo lote ou transação.
- `criado_em` é a hora do servidor e não pode ser alterado depois.
- Se trocar a conta do dono, troque o UID em `firestore.rules` e publique de novo.
- Testes: `npm run test:emulador`. Eles provam cada regra acima, inclusive que outra
  conta é bloqueada em todas as coleções.

### O que as rules NÃO conseguem garantir

1. **Contas e cálculos.** As rules não comparam decimais com segurança, porque só têm
   ponto flutuante. Por isso não conferem se peso bruto > tara, se a sobra ≤ saída nem
   se o custo está certo. Quem garante isso é o app (`calculos.js`, com Decimal).
2. **Se as cópias estão certas.** Não conferem se a tara, o preço/kg e a taxa copiados na
   saída eram mesmo os valores do cadastro naquele momento.
3. **Chave estrangeira ao apagar.** As rules não fazem consultas, então não conseguem
   impedir que se apague um alimento ou recipiente que tenha saídas. O app checa antes
   de apagar. Mesmo que sobre uma saída "órfã", ela guarda o nome do alimento e do
   recipiente, então os relatórios continuam certos.
4. **Recipiente padrão apagado.** Um alimento pode ficar apontando para um recipiente
   que não existe mais. O app limpa esse campo ao apagar o recipiente.
5. **Nomes únicos.** As rules não impedem dois alimentos com o mesmo nome. O app checa.
6. **Datas impossíveis.** O formato é conferido, mas "2026-02-30" passa. O app só gera
   datas válidas.
7. **A sua senha.** Quem descobrir a senha do dono tem acesso total. Use uma senha forte
   e única.
8. **Backup.** O plano Spark não tem backup automático, e as rules não protegem contra
   o próprio dono apagar dados.

## Pré-requisitos

- Node.js 20 ou mais novo (`node -v`).
- Java 11 ou mais novo, só para rodar os emuladores (`java -version`).

## Passo a passo no Console do Firebase (feito por você)

Nada aqui pede cartão de crédito. **Se em algum momento aparecer pedido de faturamento
ou de "upgrade para o plano Blaze", recuse**: tudo deste app funciona no Spark.

1. **Criar o projeto**
   - Acesse https://console.firebase.google.com e clique em **Criar um projeto**.
   - Escolha um nome. O ID do projeto aparece embaixo do nome: **anote esse ID**.
   - O Google Analytics é opcional e o app não usa. Pode desativar.
2. **Registrar o app web**
   - Na página do projeto, clique no ícone **`</>` (Web)**.
   - Dê um apelido (ex.: `custos-cozinha`). **Não** marque "Firebase Hosting" nesta
     tela, porque o deploy será feito pelo terminal.
   - Copie os valores do objeto `firebaseConfig` para `src/firebase-config.js`,
     substituindo cada `COLE_AQUI`.
3. **Authentication (login por e-mail e senha)**
   - Menu **Criação > Authentication > Vamos começar**.
   - Aba **Método de login**: ative **E-mail/senha**. Deixe o "Link por e-mail"
     desativado.
   - Aba **Usuários > Adicionar usuário**: crie **a sua** conta (e-mail + senha forte).
     O app não tem tela de cadastro, então os usuários só são criados aqui.
   - **Copie o UID** da conta criada (coluna "UID do usuário"). Ele entra nas rules
     na etapa 4.
4. **Firestore**
   - Menu **Criação > Firestore Database > Criar banco de dados**.
   - Local: **`southamerica-east1` (São Paulo)**. ⚠️ O local **não pode ser mudado
     depois**.
   - Modo: **produção** (começa tudo bloqueado). As rules deste repositório substituem
     as do console no deploy.

> Opcional: em Authentication > Configurações > Ações do usuário existe a opção de
> desativar a criação de contas pelo cliente. Dependendo da conta, o console pede para
> fazer o upgrade para o "Identity Platform" antes. **A segurança não depende disso**:
> mesmo que alguém consiga criar uma conta pela API, as rules só liberam o UID do dono,
> então a conta nova não vê nada.

## Comandos no terminal (feitos por você)

```bash
cd web
npm install                    # instala as dependências (inclui o firebase-tools)
npx firebase login             # abre o navegador para entrar com a sua conta Google
npx firebase use dudusistemas   # projeto já configurado em .firebaserc
```

O deploy (`npm run deploy`) só será feito na etapa 9.

## Desenvolvimento

```bash
npm test                 # testes (Vitest)
npm run test:emulador    # testes que sobem os emuladores sozinhos (login; regras na etapa 4)
npm run emuladores       # terminal 1: emuladores de Auth + Firestore (projeto demo)
npm run dev:emulador     # terminal 2: app ligado aos emuladores
npm run dev              # app ligado ao projeto REAL (exige firebase-config.js preenchido)
```

Com os emuladores, nada toca o projeto real. A interface fica em http://127.0.0.1:4000,
e lá dá para criar usuários de teste em "Authentication".
