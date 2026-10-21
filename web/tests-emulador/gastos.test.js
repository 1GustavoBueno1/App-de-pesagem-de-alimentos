// Gastos contra o emulador, com as Security Rules reais ligadas.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { criarRepositorio, FORMAS_PAGAMENTO } from '../src/repositorio.js';
import { totalGastos } from '../src/calculos.js';

const DONO = '4n3QdXnAE2XtFwzxMedf0Jlee552';
let env;
let repo;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-custos-cozinha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  repo = criarRepositorio(env.authenticatedContext(DONO).firestore());
});

const gasto = (extra = {}) => ({
  descricao: 'Gasolina',
  dataPagamento: '2026-10-21',
  valor: '150',
  forma: 'Pix',
  ...extra,
});

describe('gastos', () => {
  it('as 6 formas do app são as mesmas das rules', () => {
    expect(FORMAS_PAGAMENTO).toEqual(['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência']);
    const regras = readFileSync('firestore.rules', 'utf8');
    for (const f of FORMAS_PAGAMENTO) expect(regras).toContain(`'${f}'`);
  });

  it('cria, guarda o valor como string com 2 casas e consulta por período', async () => {
    await repo.salvarGasto(gasto({ valor: '150' }));
    await repo.salvarGasto(gasto({ descricao: 'Gás', valor: '120,5', forma: 'Dinheiro', dataPagamento: '2026-10-01' }));
    await repo.salvarGasto(gasto({ descricao: 'Fora', dataPagamento: '2026-11-01' }));
    const lista = await repo.gastosDoPeriodo('2026-10-01', '2026-10-31');
    expect(lista.map((g) => [g.data_pagamento, g.descricao, g.valor])).toEqual([
      ['2026-10-01', 'Gás', '120.50'],
      ['2026-10-21', 'Gasolina', '150.00'],
    ]);
    expect(totalGastos(lista.map((g) => g.valor)).toFixed(2)).toBe('270.50');
  });

  it('gastos do dia', async () => {
    await repo.salvarGasto(gasto());
    await repo.salvarGasto(gasto({ dataPagamento: '2026-10-22' }));
    expect((await repo.gastosDoDia('2026-10-21')).length).toBe(1);
  });

  it('edita sem mudar criado_em e apaga', async () => {
    const { id } = await repo.salvarGasto(gasto());
    const antes = (await repo.gastosDoDia('2026-10-21'))[0].criado_em.toMillis();
    await repo.salvarGasto(gasto({ id, valor: '99,90', forma: 'Boleto' }));
    const [editado] = await repo.gastosDoDia('2026-10-21');
    expect([editado.valor, editado.forma_pagamento, editado.criado_em.toMillis()]).toEqual(['99.90', 'Boleto', antes]);
    await repo.apagarGasto(id);
    expect(await repo.gastosDoDia('2026-10-21')).toEqual([]);
  });

  it.each([
    [{ descricao: '  ' }, 'Descrição: informe a descrição.'],
    [{ descricao: 'x'.repeat(101) }, 'Descrição: use no máximo 100 caracteres.'],
    [{ dataPagamento: '2026-02-30' }, 'Data de pagamento: informe uma data válida.'],
    [{ valor: '0' }, 'Valor: deve ser maior que zero.'],
    [{ valor: '1,234' }, 'Valor: use no máximo 2 casas decimais (centavos).'],
    [{ valor: '' }, 'Valor: informe um valor.'],
    [{ forma: 'Cheque' }, 'Forma de pagamento: escolha uma forma da lista.'],
  ])('recusa %o', async (extra, mensagem) => {
    await expect(repo.salvarGasto(gasto(extra))).rejects.toThrow(mensagem);
  });

  it('período invertido é recusado', async () => {
    await expect(repo.gastosDoPeriodo('2026-10-31', '2026-10-01')).rejects.toThrow(
      'Período: a data inicial não pode ser depois da final.',
    );
  });
});
