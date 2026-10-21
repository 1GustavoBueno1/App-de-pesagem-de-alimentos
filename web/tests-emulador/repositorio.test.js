// Camada de dados contra o emulador, com as Security Rules reais ligadas.
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc } from 'firebase/firestore';
import { criarRepositorio } from '../src/repositorio.js';
import { semear, RECIPIENTES_INICIAIS } from '../src/seed.js';

const DONO = 'tPaDPlz9bsX9gZAfx6d0LkrPGSN2';
let env;
let db;
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
  db = env.authenticatedContext(DONO).firestore();
  repo = criarRepositorio(db);
});

async function preparar() {
  await semear(repo);
  const cuba = (await repo.recipientes()).find((r) => r.nome === 'Cuba maior');
  const arroz = await repo.salvarAlimento({ nome: 'Arroz', precoKg: '8,50', recipientePadraoId: cuba.id });
  return { cuba, arroz };
}

describe('seed', () => {
  it('cria os 6 recipientes e a taxa 0.30', async () => {
    await semear(repo);
    const nomes = (await repo.recipientes()).map((r) => `${r.nome}=${r.tara}`).sort();
    // Taras guardadas normalizadas: "2.0" vira "2".
    expect(nomes).toEqual(RECIPIENTES_INICIAIS.map(([n, t]) => `${n}=${t.replace(/\.0$/, '')}`).sort());
    expect(await repo.taxa()).toBe('0.3');
  });
  it('rodar duas vezes não duplica nem muda a taxa já existente', async () => {
    await semear(repo);
    await repo.salvarTaxaPercentual('25');
    await semear(criarRepositorio(db)); // repositório novo: lê do banco, sem cache
    expect((await repo.recipientes()).length).toBe(6);
    expect(await criarRepositorio(db).taxa()).toBe('0.25');
  });
});

describe('cadastros', () => {
  it('recusa nome repetido (ignorando maiúsculas e espaços)', async () => {
    await semear(repo);
    await expect(repo.salvarRecipiente({ nome: ' cuba MAIOR ', tara: '1' })).rejects.toThrow(
      'Nome: já existe um recipiente "Cuba maior".',
    );
  });
  it('editar mantendo o próprio nome é aceito', async () => {
    const { arroz } = await preparar();
    await repo.salvarAlimento({ id: arroz.id, nome: 'Arroz', precoKg: '9', recipientePadraoId: null });
    const salvo = (await repo.alimentos()).find((a) => a.id === arroz.id);
    expect(salvo).toMatchObject({ preco_kg: '9', recipiente_padrao_id: null });
  });
  it('valida preço e tara com mensagem do campo', async () => {
    await expect(repo.salvarAlimento({ nome: 'X', precoKg: '0', recipientePadraoId: null })).rejects.toThrow(
      'Preço por kg: deve ser maior que zero.',
    );
    await expect(repo.salvarRecipiente({ nome: 'X', tara: '-1' })).rejects.toThrow('Tara: não pode ser menor que zero.');
    await expect(repo.salvarRecipiente({ nome: '   ', tara: '1' })).rejects.toThrow('Nome: informe o nome.');
  });
  it('taxa aceita 0% e recusa negativa', async () => {
    await repo.salvarTaxaPercentual('0');
    expect(await repo.taxa()).toBe('0');
    await expect(repo.salvarTaxaPercentual('-5')).rejects.toThrow('Taxa: não pode ser menor que zero.');
  });
  it('bloqueia apagar alimento ou recipiente com saídas', async () => {
    const { cuba, arroz } = await preparar();
    await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5,3' });
    await expect(repo.apagarAlimento(arroz.id)).rejects.toThrow('Não é possível apagar "Arroz": existem saídas registradas com este alimento.');
    await expect(repo.apagarRecipiente(cuba.id)).rejects.toThrow('Não é possível apagar "Cuba maior": existem saídas registradas com este recipiente.');
  });
  it('apagar recipiente sem saídas limpa o recipiente padrão dos alimentos', async () => {
    const { cuba, arroz } = await preparar();
    await repo.apagarRecipiente(cuba.id);
    const doBanco = await getDoc(doc(db, 'alimentos', arroz.id));
    expect(doBanco.data().recipiente_padrao_id).toBeNull();
  });
});

describe('saídas e sobras', () => {
  it('saída guarda cópia de tara, preço, taxa e nomes', async () => {
    const { cuba, arroz } = await preparar();
    const s = await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5,3' });
    // Mudar o cadastro depois não muda a saída.
    await repo.salvarAlimento({ id: arroz.id, nome: 'Arroz branco', precoKg: '99', recipientePadraoId: null });
    await repo.salvarTaxaPercentual('50');
    const [salva] = await repo.saidasDoDia('2026-10-21');
    expect(salva).toMatchObject({ id: s.id, peso_bruto: '5.3', tara: '2', preco_kg: '8.5', taxa: '0.3', alimento_nome: 'Arroz' });
  });
  it('peso bruto menor ou igual à tara é recusado', async () => {
    const { cuba, arroz } = await preparar();
    await expect(
      repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '2' }),
    ).rejects.toThrow('Peso bruto: precisa ser maior que a tara do recipiente.');
  });
  it('data inválida é recusada', async () => {
    const { cuba, arroz } = await preparar();
    await expect(
      repo.criarSaida({ data: '2026-02-30', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5' }),
    ).rejects.toThrow('Data: informe uma data válida.');
  });
  it('consulta só o dia pedido', async () => {
    const { cuba, arroz } = await preparar();
    await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5' });
    await repo.criarSaida({ data: '2026-10-22', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '6' });
    expect((await repo.saidasDoDia('2026-10-21')).map((s) => s.peso_bruto)).toEqual(['5']);
  });
  it('sobra: cria, valida limites, edita e apaga', async () => {
    const { cuba, arroz } = await preparar();
    const s = await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5,3' });
    const saida = (await repo.saidasDoDia('2026-10-21'))[0];
    await expect(repo.salvarSobra(saida, '1,9', false)).rejects.toThrow(
      'Peso bruto da sobra: não pode ser menor que a tara do recipiente (2,000 kg).',
    );
    await expect(repo.salvarSobra(saida, '5,4', false)).rejects.toThrow('Sobra: não pode ser maior que a saída (3,300 kg).');
    await repo.salvarSobra(saida, '2,5', false);
    await repo.salvarSobra(saida, '2,0', true); // edição: sobra zero é aceita
    expect((await repo.sobrasDe([s.id])).get(s.id).peso_bruto).toBe('2');
    await repo.apagarSobra(s.id);
    expect((await repo.sobrasDe([s.id])).size).toBe(0);
  });
  it('apagar saída apaga a sobra junto', async () => {
    const { cuba, arroz } = await preparar();
    const s = await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5,3' });
    await repo.salvarSobra((await repo.saidasDoDia('2026-10-21'))[0], '2,5', false);
    await repo.apagarSaida(s.id);
    expect(await repo.saidasDoDia('2026-10-21')).toEqual([]);
    expect((await getDoc(doc(db, 'sobras', s.id))).exists()).toBe(false);
  });
  it('editar saída: trocar alimento e valores à mão', async () => {
    const { cuba, arroz } = await preparar();
    const feijao = await repo.salvarAlimento({ nome: 'Feijão', precoKg: '7', recipientePadraoId: null });
    const s = await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5,3' });
    await repo.editarSaida(s.id, {
      alimentoId: feijao.id,
      recipienteId: cuba.id,
      pesoBruto: '6',
      precoKg: '7,25',
      tara: '2',
      taxaPercentual: '30',
    });
    const [salva] = await repo.saidasDoDia('2026-10-21');
    expect(salva).toMatchObject({ alimento_nome: 'Feijão', peso_bruto: '6', preco_kg: '7.25', taxa: '0.3' });
  });
  it('sobrasDe busca mais de 30 IDs (limite do "in")', async () => {
    const { cuba, arroz } = await preparar();
    const ids = [];
    for (let i = 0; i < 31; i++) {
      const s = await repo.criarSaida({ data: '2026-10-21', alimentoId: arroz.id, recipienteId: cuba.id, pesoBruto: '5' });
      ids.push(s.id);
    }
    const saidas = await repo.saidasDoDia('2026-10-21');
    await repo.salvarSobra(saidas.find((s) => s.id === ids[30]), '2,5', false);
    expect((await repo.sobrasDe(ids)).has(ids[30])).toBe(true);
  });
  it('observação do dia', async () => {
    expect(await repo.observacao('2026-10-21')).toBe('');
    await repo.salvarObservacao('2026-10-21', 'Faltou gás');
    expect(await criarRepositorio(db).observacao('2026-10-21')).toBe('Faltou gás');
  });
});
