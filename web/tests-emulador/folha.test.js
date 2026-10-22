// Folha de pagamento no emulador, com as Security Rules reais. Dados INVENTADOS: o
// repositório é público, então nomes e salários reais nunca entram aqui.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { criarRepositorio } from '../src/repositorio.js';
import { lerLinhasFolha } from '../src/folha.js';

const DONO = '4n3QdXnAE2XtFwzxMedf0Jlee552';
let env;
const dono = () => env.authenticatedContext(DONO).firestore();
const outro = () => env.authenticatedContext('outra-conta').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();
const repo = () => criarRepositorio(dono());

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-custos-cozinha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const registro = (extra = {}) => ({ nome: 'Fulano', salario: '3000.00', premio: '500.00', lote: 2, criado_em: serverTimestamp(), ...extra });

describe('regras da folha', () => {
  it('dono grava e lê; outra conta e visitante não veem nada', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'folha/a'), registro()));
    await assertSucceeds(getDoc(doc(dono(), 'folha/a')));
    await assertFails(getDoc(doc(outro(), 'folha/a')));
    await assertFails(getDoc(doc(anonimo(), 'folha/a')));
    await assertFails(getDocs(collection(outro(), 'folha')));
    await assertFails(setDoc(doc(outro(), 'folha/b'), registro()));
    await assertFails(deleteDoc(doc(outro(), 'folha/a')));
  });
  it('prêmio zero é aceito (salário e prêmio como string com 2 casas)', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'folha/a'), registro({ premio: '0.00' })));
    await assertSucceeds(setDoc(doc(dono(), 'folha/b'), registro({ premio: '0' })));
  });
  it.each([
    ['salário como number', { salario: 3000 }],
    ['prêmio como number', { premio: 500 }],
    ['salário zero', { salario: '0.00' }],
    ['salário negativo', { salario: '-1' }],
    ['prêmio negativo', { premio: '-5' }],
    ['salário com vírgula', { salario: '3000,00' }],
    ['salário com 3 casas', { salario: '3000.123' }],
    ['prêmio com 3 casas', { premio: '10.123' }],
    ['lote 0', { lote: 0 }],
    ['lote 5', { lote: 5 }],
    ['lote como texto', { lote: '2' }],
    ['lote decimal', { lote: 1.5 }],
    ['nome vazio', { nome: '' }],
    ['nome longo', { nome: 'x'.repeat(61) }],
    ['campo extra', { cpf: '000' }],
    ['criado_em do celular', { criado_em: new Date('2020-01-01') }],
  ])('recusa: %s', (_, mudanca) => assertFails(setDoc(doc(dono(), 'folha/x'), registro(mudanca))));
  it('campo faltando é recusado', () => {
    const { premio, ...semPremio } = registro();
    return assertFails(setDoc(doc(dono(), 'folha/x'), semPremio));
  });
  it('edição mantém criado_em; trocar criado_em é recusado', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'folha/a'), registro()));
    await assertSucceeds(updateDoc(doc(dono(), 'folha/a'), { salario: '3100.00', lote: 3 }));
    await assertFails(updateDoc(doc(dono(), 'folha/a'), { criado_em: serverTimestamp() }));
  });
  it('dono apaga', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'folha/a'), registro()));
    await assertSucceeds(deleteDoc(doc(dono(), 'folha/a')));
  });
});

describe('cadastro da folha (repositório)', () => {
  it('cadastra aceitando vírgula e milhar, e guarda como string com 2 casas', async () => {
    await repo().salvarFolha({ nome: ' Ana  Lima ', salario: 'R$ 3.500,5', premio: '250', lote: '2' });
    const [a] = await repo().folha();
    expect(a).toMatchObject({ nome: 'Ana Lima', salario: '3500.50', premio: '250.00', lote: 2 });
  });
  it('prêmio em branco vira 0,00', async () => {
    await repo().salvarFolha({ nome: 'Bia', salario: '2000', premio: '', lote: 1 });
    expect((await repo().folha())[0].premio).toBe('0.00');
  });
  it('edita sem criar outro e mantém um registro só', async () => {
    const a = await repo().salvarFolha({ nome: 'Caio', salario: '2000', premio: '100', lote: 1 });
    await repo().salvarFolha({ id: a.id, nome: 'Caio', salario: '2100', premio: '100', lote: 4 });
    const lista = await repo().folha();
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ salario: '2100.00', lote: 4 });
  });
  it('recusa nome repetido (sem diferenciar maiúsculas) mas aceita editar o próprio', async () => {
    const a = await repo().salvarFolha({ nome: 'Dani', salario: '2000', premio: '0', lote: 1 });
    await expect(repo().salvarFolha({ nome: 'dani', salario: '1', premio: '0', lote: 1 })).rejects.toThrow('Nome: já existe um funcionário "Dani".');
    await expect(repo().salvarFolha({ id: a.id, nome: 'Dani', salario: '2500', premio: '0', lote: 1 })).resolves.toBeTruthy();
  });
  it.each([
    [{ nome: '  ', salario: '1', premio: '0', lote: 1 }, 'Nome: informe o nome.'],
    [{ nome: 'X', salario: '', premio: '0', lote: 1 }, 'Salário: informe um valor.'],
    [{ nome: 'X', salario: '0', premio: '0', lote: 1 }, 'Salário: deve ser maior que zero.'],
    [{ nome: 'X', salario: '1,234', premio: '0', lote: 1 }, 'Salário: use no máximo 2 casas decimais (centavos).'],
    [{ nome: 'X', salario: '1', premio: '-5', lote: 1 }, 'Prêmio: não pode ser negativo.'],
    [{ nome: 'X', salario: '1', premio: '0', lote: 7 }, 'Lote: escolha de 1 a 4.'],
    [{ nome: 'X', salario: '1', premio: '0', lote: '' }, 'Lote: escolha de 1 a 4.'],
  ])('recusa %o', async (dados, mensagem) => {
    await expect(repo().salvarFolha(dados)).rejects.toThrow(mensagem);
  });
  it('apaga', async () => {
    const a = await repo().salvarFolha({ nome: 'Edu', salario: '1000', premio: '0', lote: 3 });
    await repo().apagarFolha(a.id);
    expect(await repo().folha()).toEqual([]);
  });
  it('importa a tabela colada; nomes já cadastrados são ignorados, sem duplicar', async () => {
    await repo().salvarFolha({ nome: 'Ana Lima', salario: '9999', premio: '0', lote: 4 });
    const { validas } = lerLinhasFolha('Ana Lima\tR$ 3.500,00\tR$ 500,00\t2\nBeto\tR$ 2.000,00\tR$ 250,00\t1\nCarlos — Auxiliar\tR$ 2.500,00\tR$ 0,00\t3');
    const r = await repo().importarFolha(validas);
    expect(r).toEqual({ criados: 2, ignorados: ['Ana Lima'] });
    const lista = await repo().folha();
    expect(lista.map((f) => f.nome)).toEqual(['Ana Lima', 'Beto', 'Carlos — Auxiliar']);
    expect(lista[0].salario).toBe('9999.00'); // o existente NÃO foi sobrescrito
  });
  it('importar duas vezes a mesma tabela não duplica', async () => {
    const { validas } = lerLinhasFolha('Fábio 5000 500 3\nGina 2200 300 1');
    await repo().importarFolha(validas);
    expect(await repo().importarFolha(validas)).toEqual({ criados: 0, ignorados: ['Fábio', 'Gina'] });
    expect(await repo().folha()).toHaveLength(2);
  });
  it('outra conta não cadastra nem lê (as regras recusam)', async () => {
    const intruso = criarRepositorio(outro());
    await expect(intruso.salvarFolha({ nome: 'X', salario: '1', premio: '0', lote: 1 })).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(intruso.folha()).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

const pagamento = (extra = {}) => ({
  mes: '2026-10',
  funcionario_id: 'a',
  nome: 'Fulano',
  salario: '3000.00',
  premio: '500.00',
  lote: 2,
  pago_em: serverTimestamp(),
  ...extra,
});

describe('regras dos pagamentos da folha', () => {
  beforeEach(() => env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'folha/a'), registro({ criado_em: new Date() }))));

  it('dono marca pago, lê e desmarca; outra conta e visitante não', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), pagamento()));
    await assertSucceeds(getDoc(doc(dono(), 'pagamentos_folha/2026-10_a')));
    await assertFails(getDoc(doc(outro(), 'pagamentos_folha/2026-10_a')));
    await assertFails(getDoc(doc(anonimo(), 'pagamentos_folha/2026-10_a')));
    await assertFails(deleteDoc(doc(outro(), 'pagamentos_folha/2026-10_a')));
    await assertFails(setDoc(doc(outro(), 'pagamentos_folha/2026-11_a'), pagamento({ mes: '2026-11' })));
    await assertSucceeds(deleteDoc(doc(dono(), 'pagamentos_folha/2026-10_a')));
  });
  it('não edita um pagamento já gravado', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), pagamento()));
    await assertFails(updateDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), { salario: '1.00' }));
    await assertFails(setDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), pagamento({ salario: '1.00' })));
    await assertFails(updateDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), { pago_em: serverTimestamp() }));
  });
  it.each([
    ['valor diferente do da folha', { salario: '1.00' }],
    ['prêmio diferente do da folha', { premio: '1.00' }],
    ['lote diferente do da folha', { lote: 3 }],
    ['nome diferente do da folha', { nome: 'Outro' }],
    ['pessoa que não existe na folha', { funcionario_id: 'nao-existe' }],
    ['mês inválido', { mes: '2026-13' }],
    ['mês com dia', { mes: '2026-10-01' }],
    ['campo extra', { cpf: '000' }],
    ['pago_em do celular', { pago_em: new Date('2020-01-01') }],
    ['salário como number', { salario: 3000 }],
  ])('recusa: %s', (_, mudanca) => assertFails(setDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), pagamento(mudanca))));
  it('ID precisa ser mês_pessoa', async () => {
    await assertFails(setDoc(doc(dono(), 'pagamentos_folha/qualquer'), pagamento()));
    await assertFails(setDoc(doc(dono(), 'pagamentos_folha/2026-11_a'), pagamento()));
  });
  it('campo faltando é recusado', () => {
    const { nome, ...sem } = pagamento();
    return assertFails(setDoc(doc(dono(), 'pagamentos_folha/2026-10_a'), sem));
  });
});

describe('pagamentos da folha (repositório)', () => {
  const nova = (nome, lote = 1) => repo().salvarFolha({ nome, salario: '2000', premio: '100', lote });

  it('marca pago só no mês escolhido; outro mês continua em aberto', async () => {
    const a = await nova('Ana');
    const b = await nova('Beto');
    await repo().marcarPago('2026-10', a);
    expect([...(await repo().pagamentosDoMes('2026-10')).keys()]).toEqual([a.id]);
    expect((await repo().pagamentosDoMes('2026-11')).size).toBe(0);
    const p = (await repo().pagamentosDoMes('2026-10')).get(a.id);
    expect(p).toMatchObject({ nome: 'Ana', salario: '2000.00', premio: '100.00', lote: 1, mes: '2026-10' });
    expect(p.pago_em).toBeTruthy();
    expect((await repo().pagamentosDoMes('2026-10')).has(b.id)).toBe(false);
  });
  it('marcar duas vezes não dá erro nem duplica', async () => {
    const a = await nova('Ana');
    await repo().marcarPago('2026-10', a);
    await expect(repo().marcarPago('2026-10', a)).resolves.toBeUndefined();
    expect((await repo().pagamentosDoMes('2026-10')).size).toBe(1);
  });
  it('desmarca', async () => {
    const a = await nova('Ana');
    await repo().marcarPago('2026-10', a);
    await repo().desmarcarPago('2026-10', a.id);
    expect((await repo().pagamentosDoMes('2026-10')).size).toBe(0);
  });
  it('o valor pago fica gravado mesmo se a folha mudar depois', async () => {
    const a = await nova('Ana');
    await repo().marcarPago('2026-10', a);
    await repo().salvarFolha({ id: a.id, nome: 'Ana', salario: '2500', premio: '100', lote: 1 });
    expect((await repo().pagamentosDoMes('2026-10')).get(a.id).salario).toBe('2000.00');
  });
  it('lista de pessoa desatualizada (valor mudou) é recusada pelas regras', async () => {
    const a = await nova('Ana');
    await repo().salvarFolha({ id: a.id, nome: 'Ana', salario: '2500', premio: '100', lote: 1 });
    await expect(repo().marcarPago('2026-10', a)).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('mês inválido é recusado antes de ir ao banco', async () => {
    const a = await nova('Ana');
    await expect(repo().marcarPago('2026-13', a)).rejects.toThrow('Mês inválido.');
    await expect(repo().pagamentosDoMes('x')).rejects.toThrow('Mês inválido.');
    await expect(repo().desmarcarPago('', a.id)).rejects.toThrow('Mês inválido.');
  });
  it('outra conta não lê nem marca', async () => {
    const a = await nova('Ana');
    const intruso = criarRepositorio(outro());
    await expect(intruso.pagamentosDoMes('2026-10')).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(intruso.marcarPago('2026-10', a)).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
