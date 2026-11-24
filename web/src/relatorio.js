// Dados do relatório de um dia, já formatados como texto (sem nada de PDF aqui).
import { D, totalGastos } from './calculos.js';
import { formatarData, dataHoraSP, rotuloMes } from './datas.js';
import { dinheiro, numero, peso, percentual, taxaPercentual } from './formato.js';
import { resumirDia } from './resumo.js';

export const COLUNAS = [
  'Alimento',
  'Recipiente',
  'Peso líquido (kg)',
  'Preço/kg (R$)',
  'Taxa',
  'Custo de produção (R$)',
  'Sobra (kg)',
  '% sobra',
];

export function montarRelatorio({ dia, saidas, sobras, observacao, gastos, geradoEm = new Date() }) {
  const { linhas, totais } = resumirDia(saidas, sobras);
  const temGastos = gastos.length > 0;
  return {
    titulo: `Relatório de produção: ${formatarData(dia)}`,
    geradoEm: `Gerado em ${dataHoraSP(geradoEm)}`,
    nomeArquivo: `relatorio-${dia}.pdf`,
    colunas: COLUNAS,
    linhas: linhas.map((l) => [
      l.saida.alimento_nome,
      l.saida.recipiente_nome,
      numero(l.liquido, 3),
      numero(l.saida.preco_kg, 2),
      taxaPercentual(l.saida.taxa),
      numero(l.custo, 2),
      l.sobra ? numero(l.sobra, 3) : '—',
      l.percentual ? percentual(l.percentual) : '—',
    ]),
    totais: linhas.length
      ? ['Totais', '', numero(totais.liquido, 3), '', '', numero(totais.custo, 2), numero(totais.sobra, 3), '']
      : null,
    observacao: observacao ? observacao : null,
    gastos: temGastos
      ? {
          linhas: gastos.map((g) => [g.descricao, g.forma_pagamento, numero(g.valor, 2)]),
          total: numero(totalGastos(gastos.map((g) => g.valor)), 2),
        }
      : null,
  };
}

// ---- Relatório semanal e mensal -------------------------------------------------
// Mesmas contas do relatório do dia (resumirDia), somadas por dia e por alimento.

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diaDaSemana(dia) {
  const [a, m, d] = dia.split('-').map(Number);
  return NOMES_DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

const vazio = () => ({ saidas: 0, liquido: D(0), custo: D(0), sobra: D(0) });
function acumular(t, l) {
  t.saidas += 1;
  t.liquido = t.liquido.plus(l.liquido);
  t.custo = t.custo.plus(l.custo);
  if (l.sobra) t.sobra = t.sobra.plus(l.sobra);
}

/**
 * @param tipo 'semanal' | 'mensal'
 * @param inicio, fim  AAAA-MM-DD (inclusive)
 * @param saidas  saídas do período; sobras: Map idDaSaida -> { peso_bruto }; gastos do período
 */
export function montarRelatorioPeriodo({ tipo, inicio, fim, saidas, sobras, gastos, geradoEm = new Date() }) {
  const { linhas, totais } = resumirDia(saidas, sobras);

  const porDia = new Map();
  const porAlimento = new Map();
  for (const l of linhas) {
    if (!porDia.has(l.saida.data)) porDia.set(l.saida.data, vazio());
    acumular(porDia.get(l.saida.data), l);
    if (!porAlimento.has(l.saida.alimento_nome)) porAlimento.set(l.saida.alimento_nome, vazio());
    acumular(porAlimento.get(l.saida.alimento_nome), l);
  }

  const totalDosGastos = totalGastos(gastos.map((g) => g.valor));
  const periodo = `${formatarData(inicio)} a ${formatarData(fim)}`;
  const titulo =
    tipo === 'mensal'
      ? `Relatório mensal de produção: ${rotuloMes(inicio.slice(0, 7))}`
      : `Relatório semanal de produção: ${periodo}`;
  const nomeArquivo = tipo === 'mensal' ? `relatorio-mensal-${inicio.slice(0, 7)}.pdf` : `relatorio-semanal-${inicio}-a-${fim}.pdf`;
  const linhaTotal = (rotulo, t) => [rotulo, String(t.saidas), numero(t.liquido, 3), numero(t.custo, 2), numero(t.sobra, 3)];
  const geral = { saidas: linhas.length, ...totais };

  return {
    titulo,
    subtitulo: tipo === 'mensal' ? `Período: ${periodo}` : null,
    geradoEm: `Gerado em ${dataHoraSP(geradoEm)}`,
    nomeArquivo,
    vazio: linhas.length === 0,
    resumo: [
      ['Custo de produção', dinheiro(totais.custo)],
      ['Peso líquido', peso(totais.liquido)],
      ['Sobra registrada', peso(totais.sobra)],
      ['Dias com produção', String(porDia.size)],
      ['Custo médio por dia com produção', porDia.size ? dinheiro(totais.custo.div(porDia.size).toDecimalPlaces(2)) : '—'],
      ['Gastos do período', dinheiro(totalDosGastos)],
    ],
    porDia: {
      colunas: ['Dia', 'Saídas', 'Peso líquido (kg)', 'Custo de produção (R$)', 'Sobra (kg)'],
      linhas: [...porDia.entries()].map(([dia, t]) => linhaTotal(`${formatarData(dia)} (${diaDaSemana(dia)})`, t)),
      totais: linhaTotal('Totais', geral),
    },
    porAlimento: {
      colunas: ['Alimento', 'Saídas', 'Peso líquido (kg)', 'Custo de produção (R$)', 'Sobra (kg)'],
      // Do maior custo para o menor: o que mais pesa no custo aparece primeiro.
      linhas: [...porAlimento.entries()]
        .sort(([na, a], [nb, b]) => b.custo.cmp(a.custo) || na.localeCompare(nb, 'pt-BR'))
        .map(([nome, t]) => linhaTotal(nome, t)),
      totais: linhaTotal('Totais', geral),
    },
    gastos: gastos.length
      ? {
          linhas: gastos.map((g) => [formatarData(g.data_pagamento), g.descricao, g.forma_pagamento, numero(g.valor, 2)]),
          total: numero(totalDosGastos, 2),
        }
      : null,
  };
}
