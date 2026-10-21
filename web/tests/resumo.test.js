import { describe, it, expect } from 'vitest';
import { resumirDia } from '../src/resumo.js';

const saida = (id, extra = {}) => ({
  id,
  alimento_nome: 'Arroz',
  recipiente_nome: 'Cuba maior',
  peso_bruto: '5.3',
  tara: '2.0',
  preco_kg: '8.50',
  taxa: '0.30',
  ...extra,
});

describe('resumirDia', () => {
  it('calcula cada linha com calculos.js', () => {
    const { linhas } = resumirDia([saida('a')], new Map([['a', { peso_bruto: '2.5' }]]));
    const l = linhas[0];
    expect(l.liquido.toFixed(3)).toBe('3.300');
    expect(l.custo.toFixed(2)).toBe('36.47');
    expect(l.sobra.toFixed(3)).toBe('0.500');
    expect(l.percentual.toFixed(1)).toBe('15.2');
  });

  it('saída sem sobra fica com sobra e % nulos', () => {
    const { linhas } = resumirDia([saida('a')], new Map());
    expect(linhas[0].sobra).toBeNull();
    expect(linhas[0].percentual).toBeNull();
  });

  it('totais batem com a soma das linhas exibidas', () => {
    const saidas = [saida('a'), saida('b', { peso_bruto: '2.25', tara: '0', preco_kg: '10.10' })];
    const { linhas, totais } = resumirDia(saidas, new Map([['a', { peso_bruto: '2.5' }]]));
    expect(totais.liquido.toFixed(3)).toBe('5.550');
    // 36.47 + (2.25 × 10.10 × 1.30 = 29.5425 -> 29.54)
    expect(linhas[1].custo.toFixed(2)).toBe('29.54');
    expect(totais.custo.toFixed(2)).toBe('66.01');
    expect(totais.sobra.toFixed(3)).toBe('0.500');
  });

  it('dia vazio dá totais zero', () => {
    const { linhas, totais } = resumirDia([], new Map());
    expect(linhas).toEqual([]);
    expect(totais.custo.toFixed(2)).toBe('0.00');
  });
});
