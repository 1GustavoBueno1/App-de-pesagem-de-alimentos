import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { perfilDe, UID_DONO, UID_OPERADOR, ABAS_OPERADOR } from '../src/perfis.js';

describe('perfis', () => {
  it('Rubens é operador', () => expect(perfilDe({ uid: UID_OPERADOR })).toBe('operador'));
  it('o dono é dono', () => expect(perfilDe({ uid: UID_DONO })).toBe('dono'));
  it('operador vê só saída e sobra na Pesagem', () => expect(ABAS_OPERADOR).toEqual(['saida', 'sobra']));
  it('os UIDs são os mesmos das rules', () => {
    const regras = readFileSync('firestore.rules', 'utf8');
    expect(regras).toContain(`'${UID_DONO}'`);
    expect(regras).toContain(`'${UID_OPERADOR}'`);
  });
});
