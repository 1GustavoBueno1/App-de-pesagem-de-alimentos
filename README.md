# App de pesagem de alimentos (Custos da Cozinha)

App web para controlar o custo de produção de uma cozinha: registra o peso de cada
alimento que sai, o que volta como sobra, calcula o custo e o percentual de sobra, gera o
relatório do dia em PDF e controla gastos e a folha de salários.

É usado por uma única pessoa (o dono) e roda **100% no plano gratuito (Spark) do
Firebase**: Hosting, Firestore e Authentication. Não tem servidor próprio nem faturamento.

- App publicado: https://dudusistemas.web.app (só a conta do dono consegue entrar)

## O que o app faz

| Seção | O que tem |
|---|---|
| **Pesagem** | Registrar saída, registrar sobra, ver e corrigir o dia (Hoje) e Relatórios com PDF |
| **Gastos** | Gastos avulsos por período e a aba **Salários** (folha com salário, prêmio, lote e pagamento mês a mês) |
| **Cadastros** | Alimentos (preço/kg e recipiente padrão), recipientes (tara) e a taxa |

## Regras de cálculo

| Grandeza | Fórmula | Arredondamento |
|---|---|---|
| Peso líquido | peso bruto − tara | sem arredondar |
| Custo do alimento | peso líquido × preço/kg | 2 casas, meio para cima |
| Custo de produção | peso líquido × preço/kg × (1 + taxa) | 2 casas, uma vez no fim |
| Sobra (kg) | peso bruto da sobra − tara do recipiente da saída | sem arredondar |
| % de sobra | sobra ÷ peso líquido da saída × 100 | 1 casa, meio para cima |

As contas usam decimal exato (`decimal.js`), nunca ponto flutuante. Cada saída guarda uma
cópia da tara, do preço/kg e da taxa do momento, então mudar o cadastro depois não altera
o passado.

## Estrutura do repositório

```
web/                                     o app (é isto que está publicado)
  src/                                   código: cálculos, telas, PDF, acesso ao Firestore
  tests/                                 testes unitários (Vitest)
  tests-emulador/                        testes contra os emuladores (login, regras, dados)
  firestore.rules                        regras de segurança do Firestore
  firebase.json                          Hosting, cabeçalhos de segurança e emuladores
  README.md                              guia completo: Firebase, segurança, deploy e custos
.github/workflows/deploy-firebase.yml    deploy automático
2026-10-18-app-custos-cozinha-design.md  documento de design (telas, regras e decisões)
calculos.py, db.py, test_calculos.py,
app.py, relatorio.py                     protótipo inicial em Python (veja abaixo)
```

## Como rodar

Pré-requisitos: Node.js 20 ou mais novo e, só para os emuladores, Java 11 ou mais novo.

```bash
cd web
npm install
```

Desenvolvimento local com os emuladores (nada toca o projeto real):

```bash
npm run emuladores       # terminal 1: emuladores de Auth + Firestore
npm run dev:emulador     # terminal 2: app ligado aos emuladores
```

Testes:

```bash
npm test                 # testes unitários
npm run test:emulador    # testes no emulador, incluindo as regras de segurança
```

Para criar o seu próprio projeto no Firebase, configurar o login e publicar, siga o passo a
passo em [`web/README.md`](web/README.md).

## Deploy

Automático pelo GitHub Actions: a cada mudança na branch `main` dentro de `web/`, o
workflow roda os testes unitários e os testes no emulador e, só se tudo passar, faz o build
e publica o Hosting e as regras do Firestore. A chave da conta de serviço fica no secret
`FIREBASE_SERVICE_ACCOUNT` e nunca entra no código.

## Segurança

- Só a conta do dono (UID fixo em `web/firestore.rules`) lê e escreve. Outras contas e
  visitantes não veem nada.
- A configuração em `web/src/firebase-config.js` não é segredo; quem protege os dados são
  as regras do Firestore.
- **Este repositório é público.** Nunca coloque nele chaves de conta de serviço, senhas,
  nem nomes ou salários reais (em código, testes, commits ou pull requests).

Detalhes, incluindo o que as regras não conseguem garantir, estão em
[`web/README.md`](web/README.md).

## Protótipo em Python

Os arquivos `.py` na raiz são a primeira versão do projeto, anterior ao app web, e **não
fazem parte do app publicado**:

- `calculos.py` e `test_calculos.py`: as regras de cálculo e seus testes (pytest). O
  `web/src/calculos.js` é o porte dessas regras para JavaScript.
- `db.py`: rascunho de banco SQLite, inacabado (tem erros e não é usado).
- `app.py` e `relatorio.py`: vazios.

Para rodar os testes do protótipo:

```bash
pip install pytest
pytest test_calculos.py
```
