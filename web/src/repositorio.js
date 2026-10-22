// Acesso ao Firestore. Recebe o texto digitado, valida com calculos.js e grava os
// valores como string. Cadastros (poucos documentos) ficam em cache na memória para
// economizar leituras; saídas, sobras e gastos são sempre consultados por data.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  documentId,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import {
  D,
  lerPeso,
  lerNaoNegativo,
  lerValor,
  lerDinheiroBR,
  pesoLiquido,
  custoProducao,
  percentualSobra,
} from './calculos.js';
import { mesValido } from './datas.js';
import { dataValida } from './datas.js';
import { paraFirestore, peso } from './formato.js';

/** Precisam ser iguais às da regra de gastos em firestore.rules (um teste confere). */
export const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'];

/** Nome comparável: sem espaços nas pontas, minúsculo. */
export const normalizar = (nome) => String(nome ?? '').trim().toLocaleLowerCase('pt-BR');

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const comId = (d) => ({ id: d.id, ...d.data() });

function lerNome(nome, lista, id, tipo) {
  const limpo = String(nome ?? '').trim();
  if (limpo === '') throw new Error('Nome: informe o nome.');
  if (limpo.length > 60) throw new Error('Nome: use no máximo 60 caracteres.');
  const repetido = lista.find((x) => x.id !== id && normalizar(x.nome) === normalizar(limpo));
  if (repetido) throw new Error(`Nome: já existe ${tipo} "${repetido.nome}".`);
  return limpo;
}

function exigirData(data) {
  if (!dataValida(data)) throw new Error('Data: informe uma data válida.');
}

export function criarRepositorio(db) {
  let cacheRecipientes = null;
  let cacheAlimentos = null;
  let cacheTaxa; // undefined = ainda não lida; null = não cadastrada

  // ---- Recipientes ---------------------------------------------------------
  async function recipientes() {
    if (!cacheRecipientes) {
      const snap = await getDocs(collection(db, 'recipientes'));
      cacheRecipientes = snap.docs.map(comId).sort(porNome);
    }
    return cacheRecipientes.map((r) => ({ ...r }));
  }

  async function salvarRecipiente({ id, nome, tara }) {
    const lista = await recipientes();
    const dados = {
      nome: lerNome(nome, lista, id, 'um recipiente'),
      tara: paraFirestore(lerNaoNegativo(tara, 'Tara'), 'Tara'),
    };
    if (id) await setDoc(doc(db, 'recipientes', id), dados);
    else id = (await addDoc(collection(db, 'recipientes'), dados)).id;
    cacheRecipientes = [...lista.filter((r) => r.id !== id), { id, ...dados }].sort(porNome);
    return { id, ...dados };
  }

  async function temSaidas(campo, id) {
    const snap = await getDocs(query(collection(db, 'saidas'), where(campo, '==', id), limit(1)));
    return !snap.empty;
  }

  async function apagarRecipiente(id) {
    const lista = await recipientes();
    const alvo = lista.find((r) => r.id === id);
    if (await temSaidas('recipiente_id', id)) {
      throw new Error(`Não é possível apagar "${alvo?.nome ?? id}": existem saídas registradas com este recipiente.`);
    }
    // Sem chave estrangeira no Firestore: limpa o recipiente padrão dos alimentos.
    const afetados = (await alimentos()).filter((a) => a.recipiente_padrao_id === id);
    const lote = writeBatch(db);
    for (const a of afetados) lote.update(doc(db, 'alimentos', a.id), { recipiente_padrao_id: null });
    lote.delete(doc(db, 'recipientes', id));
    await lote.commit();
    cacheRecipientes = lista.filter((r) => r.id !== id);
    cacheAlimentos = cacheAlimentos.map((a) => (a.recipiente_padrao_id === id ? { ...a, recipiente_padrao_id: null } : a));
  }

  // ---- Alimentos -----------------------------------------------------------
  async function alimentos() {
    if (!cacheAlimentos) {
      const snap = await getDocs(collection(db, 'alimentos'));
      cacheAlimentos = snap.docs.map(comId).sort(porNome);
    }
    return cacheAlimentos.map((a) => ({ ...a }));
  }

  async function salvarAlimento({ id, nome, precoKg, recipientePadraoId }) {
    const lista = await alimentos();
    const padrao = recipientePadraoId || null;
    if (padrao && !(await recipientes()).some((r) => r.id === padrao)) {
      throw new Error('Recipiente padrão: escolha um recipiente da lista.');
    }
    const dados = {
      nome: lerNome(nome, lista, id, 'um alimento'),
      preco_kg: paraFirestore(lerPeso(precoKg, 'Preço por kg'), 'Preço por kg'),
      recipiente_padrao_id: padrao,
    };
    if (id) await setDoc(doc(db, 'alimentos', id), dados);
    else id = (await addDoc(collection(db, 'alimentos'), dados)).id;
    cacheAlimentos = [...lista.filter((a) => a.id !== id), { id, ...dados }].sort(porNome);
    return { id, ...dados };
  }

  async function apagarAlimento(id) {
    const lista = await alimentos();
    const alvo = lista.find((a) => a.id === id);
    if (await temSaidas('alimento_id', id)) {
      throw new Error(`Não é possível apagar "${alvo?.nome ?? id}": existem saídas registradas com este alimento.`);
    }
    await deleteDoc(doc(db, 'alimentos', id));
    cacheAlimentos = lista.filter((a) => a.id !== id);
  }

  // ---- Taxa ----------------------------------------------------------------
  async function taxa() {
    if (cacheTaxa === undefined) {
      const snap = await getDoc(doc(db, 'configuracao', 'taxa'));
      cacheTaxa = snap.exists() ? snap.data().valor : null;
    }
    return cacheTaxa;
  }

  /** Recebe a taxa em percentual ("30") e guarda como fração ("0.3"). */
  async function salvarTaxaPercentual(texto) {
    const valor = paraFirestore(lerNaoNegativo(texto, 'Taxa').div(100), 'Taxa');
    await setDoc(doc(db, 'configuracao', 'taxa'), { valor });
    cacheTaxa = valor;
    return valor;
  }

  // ---- Saídas --------------------------------------------------------------
  async function buscarCadastros(alimentoId, recipienteId) {
    const alimento = (await alimentos()).find((a) => a.id === alimentoId);
    if (!alimento) throw new Error('Alimento: escolha um alimento da lista.');
    const recipiente = (await recipientes()).find((r) => r.id === recipienteId);
    if (!recipiente) throw new Error('Recipiente: escolha um recipiente da lista.');
    return { alimento, recipiente };
  }

  async function criarSaida({ data, alimentoId, recipienteId, pesoBruto }) {
    exigirData(data);
    const { alimento, recipiente } = await buscarCadastros(alimentoId, recipienteId);
    const taxaAtual = await taxa();
    if (taxaAtual === null) throw new Error('Taxa: cadastre a taxa em Cadastros antes de registrar saídas.');
    const bruto = lerPeso(pesoBruto, 'Peso bruto');
    const liquido = pesoLiquido(bruto, D(recipiente.tara));
    custoProducao(liquido, D(alimento.preco_kg), D(taxaAtual));
    const dados = {
      data,
      alimento_id: alimento.id,
      alimento_nome: alimento.nome,
      recipiente_id: recipiente.id,
      recipiente_nome: recipiente.nome,
      peso_bruto: paraFirestore(bruto, 'Peso bruto'),
      // Cópias do momento: mudar o cadastro depois não muda esta saída.
      tara: recipiente.tara,
      preco_kg: alimento.preco_kg,
      taxa: taxaAtual,
      criado_em: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, 'saidas'), dados);
    return { id: ref.id, ...dados };
  }

  /** Edição: alimento, recipiente, peso e os valores copiados podem ser trocados. */
  async function editarSaida(id, { alimentoId, recipienteId, pesoBruto, precoKg, tara, taxaPercentual }) {
    const { alimento, recipiente } = await buscarCadastros(alimentoId, recipienteId);
    const bruto = lerPeso(pesoBruto, 'Peso bruto');
    const taraD = lerNaoNegativo(tara, 'Tara');
    const preco = lerPeso(precoKg, 'Preço por kg');
    const taxaD = lerNaoNegativo(taxaPercentual, 'Taxa').div(100);
    const liquido = pesoLiquido(bruto, taraD);
    custoProducao(liquido, preco, taxaD);

    const sobra = await getDoc(doc(db, 'sobras', id));
    if (sobra.exists()) {
      const kg = D(sobra.data().peso_bruto).minus(taraD);
      if (kg.lt(0) || kg.gt(liquido)) {
        throw new Error('Sobra: com estes valores a sobra registrada ficaria inválida. Edite ou apague a sobra antes.');
      }
    }
    await updateDoc(doc(db, 'saidas', id), {
      alimento_id: alimento.id,
      alimento_nome: alimento.nome,
      recipiente_id: recipiente.id,
      recipiente_nome: recipiente.nome,
      peso_bruto: paraFirestore(bruto, 'Peso bruto'),
      tara: paraFirestore(taraD, 'Tara'),
      preco_kg: paraFirestore(preco, 'Preço por kg'),
      taxa: paraFirestore(taxaD, 'Taxa'),
    });
  }

  /** Apaga a saída e a sobra dela no mesmo lote (as rules exigem isso). */
  async function apagarSaida(id) {
    const lote = writeBatch(db);
    lote.delete(doc(db, 'saidas', id));
    lote.delete(doc(db, 'sobras', id));
    await lote.commit();
  }

  async function saidasDoDia(data) {
    exigirData(data);
    const snap = await getDocs(query(collection(db, 'saidas'), where('data', '==', data)));
    const ms = (s) => s.criado_em?.toMillis?.() ?? 0;
    return snap.docs.map(comId).sort((a, b) => ms(a) - ms(b));
  }

  // ---- Sobras (ID = ID da saída) ------------------------------------------
  async function sobrasDe(idsSaidas) {
    const mapa = new Map();
    for (let i = 0; i < idsSaidas.length; i += 30) {
      const fatia = idsSaidas.slice(i, i + 30); // o "in" aceita no máximo 30 valores
      const snap = await getDocs(query(collection(db, 'sobras'), where(documentId(), 'in', fatia)));
      for (const d of snap.docs) mapa.set(d.id, d.data());
    }
    return mapa;
  }

  /** Sobra pesada no mesmo recipiente da saída (usa a tara copiada na saída). */
  async function salvarSobra(saida, pesoBrutoTexto, jaExiste) {
    const bruto = lerNaoNegativo(pesoBrutoTexto, 'Peso bruto da sobra');
    const tara = D(saida.tara);
    const kg = bruto.minus(tara);
    if (kg.lt(0)) {
      throw new Error(`Peso bruto da sobra: não pode ser menor que a tara do recipiente (${peso(tara)}).`);
    }
    const liquido = pesoLiquido(D(saida.peso_bruto), tara);
    if (kg.gt(liquido)) throw new Error(`Sobra: não pode ser maior que a saída (${peso(liquido)}).`);
    percentualSobra(kg, liquido);
    const pesoTexto = paraFirestore(bruto, 'Peso bruto da sobra');
    const ref = doc(db, 'sobras', saida.id);
    if (jaExiste) await updateDoc(ref, { peso_bruto: pesoTexto });
    else await setDoc(ref, { peso_bruto: pesoTexto, criado_em: serverTimestamp() });
  }

  const apagarSobra = (saidaId) => deleteDoc(doc(db, 'sobras', saidaId));

  // ---- Observação do dia (ID = data) ---------------------------------------
  async function observacao(data) {
    exigirData(data);
    const snap = await getDoc(doc(db, 'observacoes_dia', data));
    return snap.exists() ? snap.data().texto : '';
  }

  async function salvarObservacao(data, texto) {
    exigirData(data);
    if (texto.length > 2000) throw new Error('Observação: use no máximo 2000 caracteres.');
    await setDoc(doc(db, 'observacoes_dia', data), { texto });
  }

  // ---- Gastos ---------------------------------------------------------------
  async function salvarGasto({ id, descricao, dataPagamento, valor, forma }) {
    const texto = String(descricao ?? '').trim();
    if (texto === '') throw new Error('Descrição: informe a descrição.');
    if (texto.length > 100) throw new Error('Descrição: use no máximo 100 caracteres.');
    if (!dataValida(dataPagamento)) throw new Error('Data de pagamento: informe uma data válida.');
    const dinheiro = lerValor(valor, 'Valor').toFixed(2);
    if (!FORMAS_PAGAMENTO.includes(forma)) throw new Error('Forma de pagamento: escolha uma forma da lista.');
    const dados = { descricao: texto, data_pagamento: dataPagamento, valor: dinheiro, forma_pagamento: forma };
    if (id) {
      await updateDoc(doc(db, 'gastos', id), dados); // criado_em não muda
    } else {
      id = (await addDoc(collection(db, 'gastos'), { ...dados, criado_em: serverTimestamp() })).id;
    }
    return { id, ...dados };
  }

  /** Gastos com data de pagamento entre inicio e fim (inclusive), por data. */
  async function gastosDoPeriodo(inicio, fim) {
    if (!dataValida(inicio) || !dataValida(fim)) throw new Error('Período: informe datas válidas.');
    if (inicio > fim) throw new Error('Período: a data inicial não pode ser depois da final.');
    const snap = await getDocs(
      query(
        collection(db, 'gastos'),
        where('data_pagamento', '>=', inicio),
        where('data_pagamento', '<=', fim),
        orderBy('data_pagamento'),
      ),
    );
    const ms = (g) => g.criado_em?.toMillis?.() ?? 0;
    return snap.docs
      .map(comId)
      .sort((a, b) => a.data_pagamento.localeCompare(b.data_pagamento) || ms(a) - ms(b));
  }

  const gastosDoDia = (dia) => gastosDoPeriodo(dia, dia);
  const apagarGasto = (id) => deleteDoc(doc(db, 'gastos', id));

  // ---- Folha de pagamento ---------------------------------------------------------
  // Poucos documentos (a folha toda), por isso a tela lê a coleção inteira ao abrir.
  async function folha() {
    const snap = await getDocs(collection(db, 'folha'));
    return snap.docs.map(comId).sort(porNome);
  }

  function lerLote(lote) {
    const n = Number(lote);
    if (String(lote ?? '').trim() === '' || !Number.isInteger(n) || n < 1 || n > 4) {
      throw new Error('Lote: escolha de 1 a 4.');
    }
    return n;
  }

  async function salvarFolha({ id, nome, salario, premio, lote }) {
    const lista = await folha();
    const dados = {
      nome: lerNome(String(nome ?? '').replace(/\s+/g, ' '), lista, id, 'um funcionário'),
      salario: lerDinheiroBR(salario, 'Salário').toFixed(2),
      premio: String(premio ?? '').trim() === '' ? '0.00' : lerDinheiroBR(premio, 'Prêmio', { permitirZero: true }).toFixed(2),
      lote: lerLote(lote),
    };
    if (id) await updateDoc(doc(db, 'folha', id), dados); // criado_em não muda
    else id = (await addDoc(collection(db, 'folha'), { ...dados, criado_em: serverTimestamp() })).id;
    return { id, ...dados };
  }

  const apagarFolha = (id) => deleteDoc(doc(db, 'folha', id));

  /** Importa linhas já validadas (lerLinhasFolha). Quem já existe é ignorado, nunca sobrescrito. */
  async function importarFolha(linhas) {
    const existentes = new Set((await folha()).map((f) => normalizar(f.nome)));
    const novas = linhas.filter((l) => !existentes.has(normalizar(l.nome)));
    const ignorados = linhas.filter((l) => existentes.has(normalizar(l.nome))).map((l) => l.nome);
    for (let i = 0; i < novas.length; i += 400) {
      const lote = writeBatch(db);
      for (const l of novas.slice(i, i + 400)) {
        lote.set(doc(collection(db, 'folha')), {
          nome: lerNome(l.nome, [], null, 'um funcionário'),
          salario: l.salario.toFixed(2),
          premio: l.premio.toFixed(2),
          lote: lerLote(l.lote),
          criado_em: serverTimestamp(),
        });
      }
      await lote.commit();
    }
    return { criados: novas.length, ignorados };
  }

  // ---- Pagamentos da folha, mês a mês ----------------------------------------------
  // Um documento por pessoa e mês (ID AAAA-MM_idDaPessoa). Existir = pago. Guarda os valores
  // da hora do pagamento, para o histórico não mudar se a folha for editada depois.
  async function pagamentosDoMes(mes) {
    if (!mesValido(mes)) throw new Error('Mês inválido.');
    const snap = await getDocs(query(collection(db, 'pagamentos_folha'), where('mes', '==', mes)));
    return new Map(snap.docs.map((d) => [d.data().funcionario_id, comId(d)]));
  }

  async function marcarPago(mes, funcionario) {
    if (!mesValido(mes)) throw new Error('Mês inválido.');
    const ref = doc(db, 'pagamentos_folha', `${mes}_${funcionario.id}`);
    if ((await getDoc(ref)).exists()) return; // já estava pago (toque repetido)
    await setDoc(ref, {
      mes,
      funcionario_id: funcionario.id,
      nome: funcionario.nome,
      salario: funcionario.salario,
      premio: funcionario.premio,
      lote: funcionario.lote,
      pago_em: serverTimestamp(),
    });
  }

  async function desmarcarPago(mes, funcionarioId) {
    if (!mesValido(mes)) throw new Error('Mês inválido.');
    await deleteDoc(doc(db, 'pagamentos_folha', `${mes}_${funcionarioId}`));
  }

  return {
    recipientes,
    salvarRecipiente,
    apagarRecipiente,
    alimentos,
    salvarAlimento,
    apagarAlimento,
    taxa,
    salvarTaxaPercentual,
    criarSaida,
    editarSaida,
    apagarSaida,
    saidasDoDia,
    sobrasDe,
    salvarSobra,
    apagarSobra,
    observacao,
    salvarObservacao,
    salvarGasto,
    gastosDoPeriodo,
    gastosDoDia,
    apagarGasto,
    folha,
    salvarFolha,
    apagarFolha,
    importarFolha,
    pagamentosDoMes,
    marcarPago,
    desmarcarPago,
  };
}
