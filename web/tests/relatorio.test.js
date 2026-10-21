import { describe, it, expect } from 'vitest';
import { montarRelatorio } from '../src/relatorio.js';
import { gerarPdf } from '../src/pdf.js';

const saida = (id, nome, extra = {}) => ({
  id,
  alimento_nome: nome,
  recipiente_nome: 'Cuba maior',
  peso_bruto: '5.3',
  tara: '2.0',
  preco_kg: '8.50',
  taxa: '0.30',
  ...extra,
});
const GERADO = new Date('2026-10-21T17:05:00Z');

function base(extra = {}) {
  return {
    dia: '2026-10-21',
    saidas: [saida('a', 'Arroz'), saida('b', 'Feijão', { peso_bruto: '4.05', tara: '3.8', preco_kg: '10.10', recipiente_nome: 'Panela de feijão' })],
    sobras: new Map([['a', { peso_bruto: '2.5' }]]),
    observacao: '',
    gastos: [],
    geradoEm: GERADO,
    ...extra,
  };
}

describe('montarRelatorio', () => {
  it('cabeçalho, nome do arquivo e hora de geração em São Paulo', () => {
    const r = montarRelatorio(base());
    expect(r.titulo).toBe('Relatório de produção: 21/10/2026');
    expect(r.geradoEm).toBe('Gerado em 21/10/2026 14:05');
    expect(r.nomeArquivo).toBe('relatorio-2026-10-21.pdf');
  });

  it('linhas com os mesmos números da tela (caso de prova 3,28)', () => {
    const r = montarRelatorio(base());
    expect(r.colunas).toEqual(['Alimento', 'Recipiente', 'Peso líquido (kg)', 'Preço/kg (R$)', 'Taxa', 'Custo de produção (R$)', 'Sobra (kg)', '% sobra']);
    expect(r.linhas).toEqual([
      ['Arroz', 'Cuba maior', '3,300', '8,50', '30%', '36,47', '0,500', '15,2%'],
      ['Feijão', 'Panela de feijão', '0,250', '10,10', '30%', '3,28', '—', '—'],
    ]);
    expect(r.totais).toEqual(['Totais', '', '3,550', '', '', '39,75', '0,500', '']);
  });

  it('sem observação e sem gastos: seções omitidas', () => {
    const r = montarRelatorio(base());
    expect(r.observacao).toBeNull();
    expect(r.gastos).toBeNull();
  });

  it('gastos do dia em seção separada, com total', () => {
    const r = montarRelatorio(
      base({
        observacao: 'Faltou gás',
        gastos: [
          { descricao: 'Gasolina', forma_pagamento: 'Pix', valor: '150.00' },
          { descricao: 'Gás', forma_pagamento: 'Dinheiro', valor: '120.5' },
        ],
      }),
    );
    expect(r.observacao).toBe('Faltou gás');
    expect(r.gastos.linhas).toEqual([
      ['Gasolina', 'Pix', '150,00'],
      ['Gás', 'Dinheiro', '120,50'],
    ]);
    expect(r.gastos.total).toBe('270,50');
  });

  it('dia sem saídas', () => {
    const r = montarRelatorio(base({ saidas: [], sobras: new Map() }));
    expect(r.linhas).toEqual([]);
    expect(r.totais).toBeNull();
  });
});

// O PDF é gerado de verdade (jsPDF roda no Node) e o texto é procurado no arquivo.
const texto = (doc) => doc.output();

describe('gerarPdf', () => {
  it('A4 retrato, uma página, com cabeçalho, linhas e totais', () => {
    const doc = gerarPdf(montarRelatorio(base()));
    expect(doc.getNumberOfPages()).toBe(1);
    const { width, height } = doc.internal.pageSize;
    expect([Math.round(width), Math.round(height)]).toEqual([210, 297]);
    const t = texto(doc);
    for (const trecho of ['21/10/2026', 'Gerado em', 'Arroz', '36,47', '3,28', '39,75', 'Página 1 de 1']) {
      expect(t).toContain(trecho);
    }
  });

  it('seção de gastos só aparece se houver gastos', () => {
    expect(texto(gerarPdf(montarRelatorio(base())))).not.toContain('Gastos do dia');
    const comGasto = gerarPdf(montarRelatorio(base({ gastos: [{ descricao: 'Gasolina', forma_pagamento: 'Pix', valor: '150' }] })));
    expect(texto(comGasto)).toContain('Gastos do dia');
    expect(texto(comGasto)).toContain('150,00');
  });

  it('linhas demais continuam na segunda página com o cabeçalho repetido', () => {
    const muitas = Array.from({ length: 70 }, (_, i) => saida(`s${i}`, `Alimento ${i}`));
    const doc = gerarPdf(montarRelatorio(base({ saidas: muitas, sobras: new Map() })));
    const paginas = doc.getNumberOfPages();
    expect(paginas).toBeGreaterThanOrEqual(2);
    const t = texto(doc);
    // Cabeçalho da tabela repetido em todas as páginas.
    expect(t.split('Custo de produ').length - 1).toBe(paginas);
    expect(t).toContain(`Página ${paginas} de ${paginas}`);
    expect(t).toContain('Alimento 69');
  });

  it('dia sem saídas gera PDF com aviso', () => {
    const t = texto(gerarPdf(montarRelatorio(base({ saidas: [], sobras: new Map() }))));
    expect(t).toContain('Nenhuma sa');
  });
});
