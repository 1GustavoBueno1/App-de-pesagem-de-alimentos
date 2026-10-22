// Dados INVENTADOS: o repositório é público, então nomes e salários reais nunca entram aqui.
import { describe, it, expect } from 'vitest';
import { D } from '../src/calculos.js';
import { resumirFolha, resumirPagamentos, lerLinhasFolha, PRAZOS_LOTE } from '../src/folha.js';

const f = (salario, premio, lote, nome = 'Fulano') => ({ nome, salario, premio, lote });

describe('resumirFolha', () => {
  const lista = [f('3000.00', '500.00', 2), f('2000.50', '250.25', 2), f('1000.00', '0.00', 1), f('4000.00', '300.00', 4)];
  const r = resumirFolha(lista);
  it('totais: salários, prêmios e total da folha', () => {
    expect(r.totais.salarios.toFixed(2)).toBe('10000.50');
    expect(r.totais.premios.toFixed(2)).toBe('1050.25');
    expect(r.totais.total.toFixed(2)).toBe('11050.75');
    expect(r.totais.pessoas).toBe(4);
  });
  it('sempre os 4 lotes, na ordem, com o prazo do dia', () => {
    expect(r.lotes.map((l) => [l.lote, l.prazo, l.pessoas])).toEqual([
      [1, 'Até dia 05', 1],
      [2, 'Até dia 10', 2],
      [3, 'Até dia 15', 0],
      [4, 'Até dia 20', 1],
    ]);
    expect(PRAZOS_LOTE).toEqual({ 1: 'Até dia 05', 2: 'Até dia 10', 3: 'Até dia 15', 4: 'Até dia 20' });
  });
  it('cada lote soma salários, prêmios e total', () => {
    const l2 = r.lotes[1];
    expect([l2.salarios, l2.premios, l2.total].map((x) => x.toFixed(2))).toEqual(['5000.50', '750.25', '5750.75']);
    expect(r.lotes[2].total.toFixed(2)).toBe('0.00');
  });
  it('a soma dos lotes é igual ao total (sem erro de centavos)', () => {
    const soma = r.lotes.reduce((t, l) => t.plus(l.total), D(0));
    expect(soma.equals(r.totais.total)).toBe(true);
  });
  it('0,1 + 0,2 não vira 0,30000000000000004', () => {
    const x = resumirFolha([f('0.10', '0.00', 1), f('0.20', '0.00', 1)]);
    expect(x.totais.salarios.toFixed(2)).toBe('0.30');
  });
  it('folha vazia: tudo zero', () => {
    const v = resumirFolha([]);
    expect([v.totais.salarios, v.totais.premios, v.totais.total].map((x) => x.toFixed(2))).toEqual(['0.00', '0.00', '0.00']);
    expect(v.lotes).toHaveLength(4);
  });
  it('recusa valor inválido guardado, dizendo qual funcionário', () =>
    expect(() => resumirFolha([f('abc', '0.00', 1, 'Beltrano')])).toThrow('Beltrano'));
});

describe('lerLinhasFolha (colar a tabela)', () => {
  it('aceita colunas separadas por tab, com R$ e milhar', () => {
    const r = lerLinhasFolha('Ana Lima\tR$ 3.500,00\tR$ 500,00\t2\nBeto\tR$ 2.000,00\tR$ 250,00\t1');
    expect(r.erros).toEqual([]);
    expect(r.validas.map((x) => [x.nome, x.salario.toFixed(2), x.premio.toFixed(2), x.lote])).toEqual([
      ['Ana Lima', '3500.00', '500.00', 2],
      ['Beto', '2000.00', '250.00', 1],
    ]);
  });
  it('aceita espaços no lugar de tabs e nomes com cargo', () => {
    const r = lerLinhasFolha('Carlos — Churrasqueiro   R$ 5.000,00   R$ 500,00   3');
    expect(r.erros).toEqual([]);
    expect(r.validas[0]).toMatchObject({ nome: 'Carlos — Churrasqueiro', lote: 3 });
  });
  it('aceita R$ colado no número e valores sem R$', () => {
    const r = lerLinhasFolha('Dani R$1.700,00 R$250,00 1\nEdu 1700 250 4');
    expect(r.erros).toEqual([]);
    expect(r.validas.map((x) => x.salario.toFixed(2))).toEqual(['1700.00', '1700.00']);
  });
  it('ignora cabeçalho, TOTAL e linhas em branco', () => {
    const r = lerLinhasFolha('Funcionário\tSalário\tPrêmio\tLote\n\nAna\t100\t10\t1\nTOTAL\tR$ 100,00\tR$ 10,00\n');
    expect(r.erros).toEqual([]);
    expect(r.validas).toHaveLength(1);
    expect(r.ignoradas).toBe(2);
  });
  it('prêmio zero é aceito; salário zero não', () => {
    expect(lerLinhasFolha('Ana 100 0 1').erros).toEqual([]);
    expect(lerLinhasFolha('Ana 0 10 1').erros).toEqual(['Linha 1: Salário: deve ser maior que zero.']);
  });
  it.each([
    ['Ana 100 10', 'Linha 1: esperado Nome, Salário, Prêmio e Lote.'],
    ['Ana 100 10 5', 'Linha 1: Lote: use 1, 2, 3 ou 4.'],
    ['Ana 100 10 0', 'Linha 1: Lote: use 1, 2, 3 ou 4.'],
    ['Ana 100 10 x', 'Linha 1: Lote: use 1, 2, 3 ou 4.'],
    ['Ana abc 10 1', 'Linha 1: Salário: "abc" não é um valor em reais válido.'],
    ['Ana 100 1,234 1', 'Linha 1: Prêmio: use no máximo 2 casas decimais (centavos).'],
    ['100 10 1', 'Linha 1: esperado Nome, Salário, Prêmio e Lote.'],
  ])('erro em %j', (texto, mensagem) => expect(lerLinhasFolha(texto).erros).toEqual([mensagem]));
  it('nome repetido dentro do texto é erro, sem diferenciar maiúsculas', () => {
    const r = lerLinhasFolha('Ana 100 10 1\nANA 200 20 2');
    expect(r.erros).toEqual(['Linha 2: o nome "ANA" aparece mais de uma vez.']);
  });
  it('nome longo demais é erro', () =>
    expect(lerLinhasFolha(`${'x'.repeat(61)} 100 10 1`).erros).toEqual(['Linha 1: Nome: use no máximo 60 caracteres.']));
  it('guarda o número da linha certa mesmo com linhas em branco no meio', () =>
    expect(lerLinhasFolha('Ana 100 10 1\n\nBia 100 10 9').erros).toEqual(['Linha 3: Lote: use 1, 2, 3 ou 4.']));
  it('texto vazio: nada válido, nada de erro', () => {
    const r = lerLinhasFolha('  \n ');
    expect([r.validas.length, r.erros.length]).toEqual([0, 0]);
  });
});

describe('resumirPagamentos', () => {
  const lista = [
    { id: 'a', ...f('3000.00', '500.00', 2) },
    { id: 'b', ...f('2000.50', '250.25', 2) },
    { id: 'c', ...f('1000.00', '0.00', 1) },
  ];
  it('ninguém pago: tudo falta', () => {
    const r = resumirPagamentos(lista, new Map());
    expect(r.pagos.pessoas).toBe(0);
    expect(r.pagos.salarios.toFixed(2)).toBe('0.00');
    expect(r.faltam.pessoas).toBe(3);
    expect(r.faltam.salarios.toFixed(2)).toBe('6000.50');
    expect(r.faltam.premios.toFixed(2)).toBe('750.25');
  });
  it('separa pagos e faltantes', () => {
    const r = resumirPagamentos(lista, new Map([['b', { salario: '2000.50', premio: '250.25' }]]));
    expect(r.pagos).toMatchObject({ pessoas: 1 });
    expect(r.pagos.salarios.toFixed(2)).toBe('2000.50');
    expect(r.pagos.premios.toFixed(2)).toBe('250.25');
    expect(r.faltam.pessoas).toBe(2);
    expect(r.faltam.salarios.toFixed(2)).toBe('4000.00');
    expect(r.faltam.premios.toFixed(2)).toBe('500.00');
  });
  it('quem foi pago conta pelo valor gravado na hora, não pelo atual', () => {
    const r = resumirPagamentos(lista, new Map([['a', { salario: '2800.00', premio: '400.00' }]]));
    expect(r.pagos.salarios.toFixed(2)).toBe('2800.00');
    expect(r.pagos.premios.toFixed(2)).toBe('400.00');
  });
  it('pagamento de pessoa que não está na lista é ignorado', () => {
    const r = resumirPagamentos(lista, new Map([['zzz', { salario: '9999.00', premio: '0.00' }]]));
    expect(r.pagos.pessoas).toBe(0);
  });
  it('lista vazia', () => {
    expect(resumirPagamentos([], new Map()).faltam.pessoas).toBe(0);
  });
});
