import { describe, it, expect } from 'vitest';
import { D } from '../src/calculos.js';
import { dinheiro, peso, percentual, taxaPercentual, paraFirestore } from '../src/formato.js';

describe('formatação para a tela (pt-BR, sem Number)', () => {
  it('dinheiro', () => {
    expect(dinheiro(D('3.28'))).toBe('R$ 3,28');
    expect(dinheiro('1234567.5')).toBe('R$ 1.234.567,50');
    expect(dinheiro(D('0'))).toBe('R$ 0,00');
  });
  it('peso com 3 casas', () => {
    expect(peso(D('3.3'))).toBe('3,300 kg');
    expect(peso('1234.5')).toBe('1.234,500 kg');
  });
  it('percentual com 1 casa', () => {
    expect(percentual(D('15.2'))).toBe('15,2%');
    expect(percentual(D('0'))).toBe('0,0%');
  });
  it('taxa como percentual sem zeros sobrando', () => {
    expect(taxaPercentual('0.30')).toBe('30%');
    expect(taxaPercentual('0.125')).toBe('12,5%');
    expect(taxaPercentual('0')).toBe('0%');
  });
});

describe('paraFirestore (string que as rules aceitam)', () => {
  it('normaliza', () => {
    expect(paraFirestore(D('3.50'), 'Peso')).toBe('3.5');
    expect(paraFirestore(D('2.0'), 'Tara')).toBe('2');
    expect(paraFirestore(D('0'), 'Tara')).toBe('0');
  });
  it('recusa mais de 6 casas', () =>
    expect(() => paraFirestore(D('1.1234567'), 'Peso bruto')).toThrow('Peso bruto: use no máximo 6 casas decimais.'));
  it('recusa mais de 9 dígitos inteiros', () =>
    expect(() => paraFirestore(D('1234567890'), 'Peso bruto')).toThrow('Peso bruto: valor grande demais.'));
});
