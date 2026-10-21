// Dados do relatório de um dia, já formatados como texto (sem nada de PDF aqui).
import { totalGastos } from './calculos.js';
import { formatarData, dataHoraSP } from './datas.js';
import { numero, percentual, taxaPercentual } from './formato.js';
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
