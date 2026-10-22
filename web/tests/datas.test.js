import { describe, it, expect } from 'vitest';
import { diaSP, formatarData, mesDe, dataValida, dataHoraSP, mesValido, rotuloMes, somarMes } from '../src/datas.js';

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

describe('dataHoraSP', () => {
  it('data e hora em São Paulo', () =>
    expect(dataHoraSP(new Date('2026-10-22T02:05:00Z'))).toBe('21/10/2026 23:05'));
});

describe('meses (AAAA-MM)', () => {
  it.each(['2026-10', '2026-01', '2026-12'])('%s é válido', (m) => expect(mesValido(m)).toBe(true));
  it.each(['2026-13', '2026-00', '2026-1', '26-10', '2026-10-01', '', null, 202610])('%s é inválido', (m) => expect(mesValido(m)).toBe(false));
  it('rótulo em português', () => {
    expect(rotuloMes('2026-10')).toBe('outubro de 2026');
    expect(rotuloMes('2027-03')).toBe('março de 2027');
  });
  it('soma meses virando o ano nos dois sentidos', () => {
    expect(somarMes('2026-10', 1)).toBe('2026-11');
    expect(somarMes('2026-12', 1)).toBe('2027-01');
    expect(somarMes('2026-01', -1)).toBe('2025-12');
    expect(somarMes('2026-03', -14)).toBe('2025-01');
    expect(somarMes('2026-10', 0)).toBe('2026-10');
  });
});
