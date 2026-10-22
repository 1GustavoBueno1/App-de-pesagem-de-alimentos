# App de custos da cozinha: design

> Escrito pelo Claude em 21/10/2026, porque o documento original não existia. As
> decisões da seção 9 foram respondidas pelo Gustavo em 21/10/2026.

## 1. Objetivo

Registrar o que sai da cozinha (peso de cada alimento) e o que volta como sobra,
calcular o custo de produção e o percentual de sobra, gerar o relatório do dia em PDF e
controlar os gastos avulsos (gasolina, gás etc.). Um único usuário (o dono).

## 2. Navegação

- Antes do login aparece só a tela de login.
- Depois do login, a barra do topo tem: **Pesagem | Gastos | Cadastros | Sair**.
- Pesagem tem quatro abas: **Registrar saída | Registrar sobra | Hoje | Relatórios**.
- No celular, a barra e as abas viram uma faixa com rolagem horizontal, e os formulários
  ficam em uma coluna.

## 3. Regras de cálculo

Implementadas em `web/src/calculos.js` (porte de `calculos.py`).

| Grandeza | Fórmula | Arredondamento |
|---|---|---|
| Peso líquido | peso bruto − tara | sem arredondar |
| Custo do alimento | peso líquido × preço/kg | 2 casas, meio para cima |
| Custo de produção | peso líquido × preço/kg × (1 + taxa) | 2 casas, **uma vez no fim** |
| Sobra (kg) | peso bruto da sobra − tara do recipiente da saída | sem arredondar |
| % de sobra | sobra ÷ peso líquido da saída × 100 | 1 casa, meio para cima |

- Peso líquido ≤ 0 é erro. Preço/kg ≤ 0 é erro. Taxa < 0 é erro (taxa 0 é aceita).
- A sobra pode ser 0 (o recipiente voltou vazio). Sobra negativa ou maior que a saída é
  erro.
- A saída guarda **cópia** de tara, preço/kg e taxa do momento. Mudar o cadastro depois
  não muda o passado.

## 4. Telas de pesagem

### 4.1 Registrar saída
Campos, na ordem do Tab:
1. **Data**: padrão é hoje (fuso America/Sao_Paulo).
2. **Alimento**: lista. Ao escolher, preenche o recipiente padrão, se o alimento tiver um.
3. **Recipiente**: lista, mostrando a tara (ex.: "Cuba maior (2,0 kg)").
4. **Peso bruto (kg)**: aceita vírgula ou ponto.

Enquanto o usuário digita, aparece uma prévia com o peso líquido, o custo do alimento e
o custo de produção (com a taxa atual). **Enter** registra. Depois de salvar aparece
"Saída registrada", o peso é limpo e o foco volta para Alimento.

### 4.2 Registrar sobra
1. **Data**: padrão é hoje.
2. **Saída**: lista das saídas dessa data **que ainda não têm sobra**
   (ex.: "Arroz · Cuba maior · 3,300 kg").
3. **Peso bruto da sobra (kg)**: pesado no **mesmo recipiente** da saída. Usa a tara
   copiada na saída.

Prévia: sobra em kg e % de sobra. **Enter** registra.

### 4.3 Hoje
- Abre no dia de hoje, mas tem um campo **Dia** para escolher outra data e corrigir
  dias anteriores (decisão 3).
- Tabela das saídas do dia: Alimento | Recipiente | Peso líquido | Custo de produção |
  Sobra | % sobra | ações.
- **Editar saída**: alimento, recipiente e peso bruto. Se trocar o alimento ou o
  recipiente, o preço ou a tara **atuais** do cadastro são preenchidos. Preço/kg, tara e
  taxa continuam editáveis à mão (decisão 2).
- **Editar sobra** e **apagar sobra**.
- **Apagar saída**: pede confirmação e apaga a sobra junto, na mesma transação.
- **Totais do dia**: peso líquido total, custo de produção total e sobra total. O % de
  sobra aparece **só em cada saída**, sem % geral (decisão 4).
- **Observação do dia**: campo de texto com botão Salvar (documento
  `observacoes_dia/AAAA-MM-DD`).

### 4.4 Relatórios
- Escolher uma data (padrão é hoje). Mostra a mesma tabela e os totais da seção 4.3,
  **só para leitura**, mais a observação e os gastos do dia.
- Botão **Gerar PDF** (seção 6).

## 5. Cadastros e gastos

- **Alimentos**: nome (único), preço/kg (> 0) e recipiente padrão (opcional).
- **Recipientes**: nome (único) e tara (≥ 0).
- **Taxa**: um valor (padrão 0,30 = 30%), aceito a partir de 0.
- Apagar um alimento ou recipiente que tenha saídas ligadas é **bloqueado**, com a
  mensagem "Não é possível apagar: existem N saídas com este item".
- **Gastos**: formulário no topo (descrição, data de pagamento, valor e forma de
  pagamento). Abaixo vêm o filtro de período (padrão: mês atual), o **total do período**
  em destaque e a lista com editar e apagar (com confirmação). O total é a soma
  exatamente das linhas exibidas.

### 5.1 Salários

Aba **Salários** dentro de Gastos (`#gastos/salarios`): folha de pagamento com **salário,
prêmio e lote** por funcionário. O prêmio é abatido do consumo do funcionário na empresa, por
isso é mostrado **separado** do salário: **Salários a pagar**, **Prêmios para abater do
consumo** e **Total da folha com prêmios**, mais o **resumo por lote** (lote 1 até dia 05,
2 até dia 10, 3 até dia 15 e 4 até dia 20). Cadastro, edição, exclusão com confirmação e
importação por colar tabela. Dados só no Firestore (coleção `folha`), visíveis só ao dono.
Não entra no PDF do dia.

## 6. Relatório PDF (uma página A4)

Gerado no navegador (jsPDF + jspdf-autotable), em A4 retrato com margens de 15 mm, pelo
botão **Gerar PDF** da aba Relatórios. O rodapé mostra "Página N de M".

1. **Cabeçalho**: "Relatório de produção: DD/MM/AAAA" e, à direita,
   "Gerado em DD/MM/AAAA HH:MM".
2. **Tabela de produção**: Alimento | Recipiente | Peso líquido (kg) | Preço/kg (R$) |
   Taxa | Custo de produção (R$) | Sobra (kg) | % sobra. Saída sem sobra mostra "—".
3. **Linha de totais**: peso líquido total, custo de produção total e sobra total
   (sem % geral).
4. **Taxa**: fica numa coluna da tabela, e não numa linha separada, porque a decisão 2
   permite taxas diferentes por saída.
5. **Observação do dia**: só aparece se houver.
6. **Gastos do dia**: seção separada, **só se houver gastos** com data de pagamento
   igual ao dia. Colunas Descrição | Forma de pagamento | Valor, e o total.
7. **Páginas**: o objetivo é caber em uma página A4. Se houver linhas demais, o PDF
   continua numa segunda página, repetindo o cabeçalho da tabela (decisão 5).

Nome do arquivo: `relatorio-AAAA-MM-DD.pdf`.

## 7. Formatação, teclado e acessibilidade

- Na tela: dinheiro como "R$ 1.234,56", peso como "3,300 kg", percentual como "15,2%",
  datas como DD/MM/AAAA.
- No Firestore: tudo como string com ponto decimal ("3.300", "28.05") e datas como
  "AAAA-MM-DD".
- Tudo funciona só com o teclado: ordem natural do Tab, **Enter** envia o formulário e
  **Esc** cancela a edição ou fecha a confirmação. O foco é visível.
- Erros aparecem junto do campo, dizendo qual campo e qual regra (ex.: "Peso bruto:
  precisa ser maior que a tara do recipiente.").
- Todo texto vindo do usuário é exibido com `textContent`, nunca com `innerHTML`.

## 8. Fora do escopo

Gráficos, histórico de alterações, multiusuário, cadastro de contas e tudo que exija o
plano pago.

## 9. Decisões (respondidas em 21/10/2026)

1. A sobra é pesada **no mesmo recipiente** da saída. **Sim.**
2. Ao editar uma saída, trocar o alimento ou o recipiente preenche os valores atuais do
   cadastro. **Sim, mas podendo trocar:** preço/kg, tara e taxa ficam editáveis.
3. "Hoje" edita o dia de hoje. **Sim, mas com uma forma de editar dias anteriores:** a tela
   tem um campo de data.
4. % de sobra geral. **Só por saída:** não existe % geral do dia.
5. PDF com linhas demais. **Pode gerar duas páginas.**
