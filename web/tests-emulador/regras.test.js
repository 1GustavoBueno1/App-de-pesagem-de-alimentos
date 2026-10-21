// Testes das Security Rules (firestore.rules) no emulador do Firestore.
import { readFileSync } from 'node:fs';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

const DONO = 'tPaDPlz9bsX9gZAfx6d0LkrPGSN2';
let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-custos-cozinha',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(() => env.cleanup());

const dono = () => env.authenticatedContext(DONO).firestore();
const outro = () => env.authenticatedContext('outra-conta').firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

// Dados válidos de cada coleção.
const recipiente = { nome: 'Cuba maior', tara: '2.0' };
const alimento = { nome: 'Arroz', preco_kg: '8.50', recipiente_padrao_id: 'cuba' };
const saida = () => ({
  data: '2026-10-21',
  alimento_id: 'arroz',
  alimento_nome: 'Arroz',
  recipiente_id: 'cuba',
  recipiente_nome: 'Cuba maior',
  peso_bruto: '5.3',
  tara: '2.0',
  preco_kg: '8.50',
  taxa: '0.30',
  criado_em: serverTimestamp(),
});
const sobra = () => ({ peso_bruto: '2.5', criado_em: serverTimestamp() });
const gasto = () => ({
  descricao: 'Gasolina',
  data_pagamento: '2026-10-21',
  valor: '150.00',
  forma_pagamento: 'Pix',
  criado_em: serverTimestamp(),
});

// Estado inicial de cada teste, gravado sem passar pelas regras.
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'recipientes/cuba'), recipiente);
    await setDoc(doc(db, 'alimentos/arroz'), alimento);
    await setDoc(doc(db, 'configuracao/taxa'), { valor: '0.30' });
    await setDoc(doc(db, 'saidas/s1'), { ...saida(), criado_em: Timestamp.now() });
    await setDoc(doc(db, 'sobras/s1'), { peso_bruto: '2.5', criado_em: Timestamp.now() });
    await setDoc(doc(db, 'observacoes_dia/2026-10-21'), { texto: 'ok' });
    await setDoc(doc(db, 'gastos/g1'), { ...gasto(), criado_em: Timestamp.now() });
  });
});

const COLECOES = [
  'recipientes/cuba',
  'alimentos/arroz',
  'configuracao/taxa',
  'saidas/s1',
  'sobras/s1',
  'observacoes_dia/2026-10-21',
  'gastos/g1',
];

describe('acesso: só o dono', () => {
  it.each(COLECOES)('dono lê %s', (c) => assertSucceeds(getDoc(doc(dono(), c))));
  it.each(COLECOES)('outra conta NÃO lê %s', (c) => assertFails(getDoc(doc(outro(), c))));
  it.each(COLECOES)('sem login NÃO lê %s', (c) => assertFails(getDoc(doc(anonimo(), c))));
  it.each(COLECOES)('outra conta NÃO apaga %s', (c) => assertFails(deleteDoc(doc(outro(), c))));

  it('outra conta NÃO lista nem consulta saídas', async () => {
    await assertFails(getDocs(collection(outro(), 'saidas')));
    await assertFails(getDocs(query(collection(outro(), 'saidas'), where('data', '==', '2026-10-21'))));
  });
  it('outra conta NÃO cria gasto válido', () => assertFails(setDoc(doc(outro(), 'gastos/g2'), gasto())));
  it('coleção fora da lista é negada até para o dono', async () => {
    await assertFails(setDoc(doc(dono(), 'outra/x'), { a: 1 }));
    await assertFails(getDoc(doc(dono(), 'outra/x')));
  });
  it('dono consulta saídas por data', () =>
    assertSucceeds(getDocs(query(collection(dono(), 'saidas'), where('data', '==', '2026-10-21')))));
});

describe('recipientes', () => {
  it('aceita válido (tara 0 incluída)', async () => {
    await assertSucceeds(setDoc(doc(dono(), 'recipientes/r2'), { nome: 'Sem tara', tara: '0' }));
  });
  it.each([
    ['tara como number', { nome: 'X', tara: 2 }],
    ['tara negativa', { nome: 'X', tara: '-1' }],
    ['tara com vírgula', { nome: 'X', tara: '2,0' }],
    ['tara texto', { nome: 'X', tara: 'abc' }],
    ['nome vazio', { nome: '', tara: '1' }],
    ['nome longo', { nome: 'x'.repeat(61), tara: '1' }],
    ['campo extra', { nome: 'X', tara: '1', cor: 'azul' }],
    ['campo faltando', { nome: 'X' }],
  ])('recusa %s', (_, dados) => assertFails(setDoc(doc(dono(), 'recipientes/r2'), dados)));
});

describe('alimentos', () => {
  it('aceita sem recipiente padrão', () =>
    assertSucceeds(setDoc(doc(dono(), 'alimentos/feijao'), { nome: 'Feijão', preco_kg: '9', recipiente_padrao_id: null })));
  it('aceita recipiente padrão existente', () =>
    assertSucceeds(setDoc(doc(dono(), 'alimentos/feijao'), { ...alimento, nome: 'Feijão' })));
  it.each([
    ['preço zero', { ...alimento, preco_kg: '0.00' }],
    ['preço negativo', { ...alimento, preco_kg: '-8' }],
    ['preço number', { ...alimento, preco_kg: 8.5 }],
    ['recipiente inexistente', { ...alimento, recipiente_padrao_id: 'nao-existe' }],
    ['recipiente padrão number', { ...alimento, recipiente_padrao_id: 1 }],
  ])('recusa %s', (_, dados) => assertFails(setDoc(doc(dono(), 'alimentos/feijao'), dados)));
});

describe('configuracao', () => {
  it('aceita taxa 0', () => assertSucceeds(setDoc(doc(dono(), 'configuracao/taxa'), { valor: '0' })));
  it('recusa taxa negativa', () => assertFails(setDoc(doc(dono(), 'configuracao/taxa'), { valor: '-0.1' })));
  it('recusa taxa number', () => assertFails(setDoc(doc(dono(), 'configuracao/taxa'), { valor: 0.3 })));
  it('recusa outro documento', () => assertFails(setDoc(doc(dono(), 'configuracao/outra'), { valor: '1' })));
});

describe('saidas', () => {
  it('aceita válida', () => assertSucceeds(setDoc(doc(dono(), 'saidas/s2'), saida())));
  it.each([
    ['peso como number', { peso_bruto: 5.3 }],
    ['peso zero', { peso_bruto: '0' }],
    ['tara number', { tara: 2 }],
    ['taxa negativa', { taxa: '-0.3' }],
    ['data com barra', { data: '21/10/2026' }],
    ['mês 13', { data: '2026-13-01' }],
    ['alimento inexistente', { alimento_id: 'nao-existe' }],
    ['recipiente inexistente', { recipiente_id: 'nao-existe' }],
    ['criado_em do cliente', { criado_em: Timestamp.fromDate(new Date('2020-01-01')) }],
    ['campo extra', { obs: 'x' }],
  ])('recusa %s', (_, mudanca) => assertFails(setDoc(doc(dono(), 'saidas/s2'), { ...saida(), ...mudanca })));

  it('edição não pode mudar criado_em', () =>
    assertFails(updateDoc(doc(dono(), 'saidas/s1'), { criado_em: serverTimestamp() })));
  it('edição válida passa', () => assertSucceeds(updateDoc(doc(dono(), 'saidas/s1'), { peso_bruto: '6.1' })));

  it('apagar saída SEM apagar a sobra é negado', () => assertFails(deleteDoc(doc(dono(), 'saidas/s1'))));
  it('apagar saída e sobra no mesmo lote é aceito', async () => {
    const db = dono();
    const lote = writeBatch(db);
    lote.delete(doc(db, 'saidas/s1'));
    lote.delete(doc(db, 'sobras/s1'));
    await assertSucceeds(lote.commit());
  });
});

describe('sobras', () => {
  beforeEach(() =>
    env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'saidas/s2'), { ...saida(), criado_em: Timestamp.now() })),
  );
  it('aceita sobra de saída existente', () => assertSucceeds(setDoc(doc(dono(), 'sobras/s2'), sobra())));
  it('aceita peso bruto 0 (recipiente sem tara voltou vazio)', () =>
    assertSucceeds(setDoc(doc(dono(), 'sobras/s2'), { ...sobra(), peso_bruto: '0' })));
  it('recusa sobra de saída inexistente', () => assertFails(setDoc(doc(dono(), 'sobras/nao-existe'), sobra())));
  it('recusa peso number', () => assertFails(setDoc(doc(dono(), 'sobras/s2'), { ...sobra(), peso_bruto: 2.5 })));
  it('recusa peso negativo', () => assertFails(setDoc(doc(dono(), 'sobras/s2'), { ...sobra(), peso_bruto: '-1' })));
});

describe('observacoes_dia', () => {
  it('aceita ID de data e texto', () =>
    assertSucceeds(setDoc(doc(dono(), 'observacoes_dia/2026-10-22'), { texto: 'Faltou gás' })));
  it('recusa ID que não é data', () => assertFails(setDoc(doc(dono(), 'observacoes_dia/hoje'), { texto: 'x' })));
  it('recusa texto longo demais', () =>
    assertFails(setDoc(doc(dono(), 'observacoes_dia/2026-10-22'), { texto: 'x'.repeat(2001) })));
});

describe('gastos', () => {
  it('aceita válido', () => assertSucceeds(setDoc(doc(dono(), 'gastos/g2'), gasto())));
  it.each(['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'])(
    'aceita forma %s',
    (forma) => assertSucceeds(setDoc(doc(dono(), 'gastos/g2'), { ...gasto(), forma_pagamento: forma })),
  );
  it.each([
    ['valor number', { valor: 150 }],
    ['valor zero', { valor: '0.00' }],
    ['valor com 3 casas', { valor: '1.234' }],
    ['valor com vírgula', { valor: '1,50' }],
    ['forma desconhecida', { forma_pagamento: 'Cheque' }],
    ['descrição vazia', { descricao: '' }],
    ['data inválida', { data_pagamento: '2026-02-30x' }],
  ])('recusa %s', (_, mudanca) => assertFails(setDoc(doc(dono(), 'gastos/g2'), { ...gasto(), ...mudanca })));
});
