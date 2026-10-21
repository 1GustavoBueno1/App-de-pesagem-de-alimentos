import { describe, it, expect } from 'vitest';
import { diaSP, formatarData, mesDe, dataValida } from '../src/datas.js';

describe('diaSP (dia no fuso America/Sao_Paulo)', () => {
  it('23:30 em São Paulo ainda é o mesmo dia (em UTC já é o seguinte)', () =>
    expect(diaSP(new Date('2026-10-22T02:30:00Z'))).toBe('2026-10-21'));
  it('00:30 em São Paulo já é o dia seguinte', () =>
    expect(diaSP(new Date('2026-10-22T03:30:00Z'))).toBe('2026-10-22'));
  it('formato AAAA-MM-DD com zeros', () => expect(diaSP(new Date('2026-01-05T15:00:00Z'))).toBe('2026-01-05'));
});

describe('formatarData', () => {
  it('AAAA-MM-DD vira DD/MM/AAAA', () => expect(formatarData('2026-10-21')).toBe('21/10/2026'));
});

describe('mesDe', () => {
  it('outubro tem 31 dias', () => expect(mesDe('2026-10-21')).toEqual({ inicio: '2026-10-01', fim: '2026-10-31' }));
  it('fevereiro de ano bissexto', () => expect(mesDe('2028-02-10')).toEqual({ inicio: '2028-02-01', fim: '2028-02-29' }));
  it('fevereiro comum', () => expect(mesDe('2026-02-10').fim).toBe('2026-02-28'));
});

describe('dataValida', () => {
  it.each(['2026-10-21', '2028-02-29'])('%s é válida', (d) => expect(dataValida(d)).toBe(true));
  it.each(['2026-02-30', '2026-13-01', '21/10/2026', '', null])('%s é inválida', (d) => expect(dataValida(d)).toBe(false));
});
