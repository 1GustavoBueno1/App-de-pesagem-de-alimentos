// Folha de pagamento: salário, prêmio e lote de cada funcionário. Os prêmios ficam
// separados do salário porque são abatidos da conta de consumo do funcionário na empresa
// (não saem como pagamento em dinheiro). Dinheiro sempre em Decimal.
import { D, lerDinheiroBR } from './calculos.js';

export const PRAZOS_LOTE = { 1: 'Até dia 05', 2: 'Até dia 10', 3: 'Até dia 15', 4: 'Até dia 20' };
export const LOTES = [1, 2, 3, 4];

const lerGuardado = (valor, funcionario, campo) => {
  try {
    return D(valor);
  } catch {
    throw new Error(`${funcionario?.nome ?? 'Funcionário'}: ${campo} guardado é inválido.`);
  }
};

/** lista: { nome, salario, premio, lote } com valores como string (como no Firestore). */
export function resumirFolha(lista) {
  const lotes = LOTES.map((lote) => ({ lote, prazo: PRAZOS_LOTE[lote], salarios: D(0), premios: D(0), total: D(0), pessoas: 0 }));
  for (const f of lista) {
    const salario = lerGuardado(f.salario, f, 'salário');
    const premio = lerGuardado(f.premio, f, 'prêmio');
    const alvo = lotes.find((l) => l.lote === f.lote);
    if (!alvo) throw new Error(`${f.nome}: lote ${f.lote} não existe.`);
    alvo.salarios = alvo.salarios.plus(salario);
    alvo.premios = alvo.premios.plus(premio);
    alvo.total = alvo.total.plus(salario).plus(premio);
    alvo.pessoas += 1;
  }
  const soma = (campo) => lotes.reduce((t, l) => t.plus(l[campo]), D(0));
  return {
    lotes,
    totais: { salarios: soma('salarios'), premios: soma('premios'), total: soma('total'), pessoas: lista.length },
  };
}

/**
 * Quanto já foi pago e quanto falta no mês. lista: pessoas da folha (com id); pagos: Map
 * id -> registro do pagamento. Quem já foi pago conta pelo valor gravado na hora do
 * pagamento; quem falta conta pelo valor atual da folha.
 */
export function resumirPagamentos(lista, pagos) {
  const vazio = () => ({ pessoas: 0, salarios: D(0), premios: D(0) });
  const resumo = { pagos: vazio(), faltam: vazio() };
  for (const f of lista) {
    const pago = pagos.get(f.id);
    const alvo = pago ? resumo.pagos : resumo.faltam;
    const fonte = pago ?? f;
    alvo.pessoas += 1;
    alvo.salarios = alvo.salarios.plus(lerGuardado(fonte.salario, f, 'salário'));
    alvo.premios = alvo.premios.plus(lerGuardado(fonte.premio, f, 'prêmio'));
  }
  return resumo;
}

const ehCabecalho = (fichas) => /^funcion[aá]rio/i.test(fichas[0] ?? '');
const ehTotal = (fichas) => (fichas[0] ?? '').toUpperCase() === 'TOTAL';

/**
 * Lê a tabela colada (colunas separadas por tab ou espaços): Nome, Salário, Prêmio, Lote.
 * Ignora cabeçalho, linhas "TOTAL" e linhas em branco. Cada erro diz o número da linha.
 */
export function lerLinhasFolha(texto) {
  const validas = [];
  const erros = [];
  let ignoradas = 0;
  const vistos = new Set();
  String(texto ?? '')
    .split(/\r?\n/)
    .forEach((bruta, i) => {
      const n = i + 1;
      const linha = bruta.trim();
      if (!linha) return;
      const fichas = linha
        .split(/\s+/)
        .map((f) => f.replace(/^R\$/i, ''))
        .filter(Boolean);
      if (ehCabecalho(fichas) || ehTotal(fichas)) {
        ignoradas += 1;
        return;
      }
      if (fichas.length < 4) {
        erros.push(`Linha ${n}: esperado Nome, Salário, Prêmio e Lote.`);
        return;
      }
      const [loteTexto, premioTexto, salarioTexto] = [fichas.at(-1), fichas.at(-2), fichas.at(-3)];
      const nome = fichas.slice(0, -3).join(' ');
      try {
        if (!/^[1-4]$/.test(loteTexto)) throw new Error('Lote: use 1, 2, 3 ou 4.');
        if (nome.length > 60) throw new Error('Nome: use no máximo 60 caracteres.');
        const salario = lerDinheiroBR(salarioTexto, 'Salário');
        const premio = lerDinheiroBR(premioTexto, 'Prêmio', { permitirZero: true });
        const chave = nome.toLocaleLowerCase('pt-BR');
        if (vistos.has(chave)) throw new Error(`o nome "${nome}" aparece mais de uma vez.`);
        vistos.add(chave);
        validas.push({ nome, salario, premio, lote: Number(loteTexto) });
      } catch (e) {
        erros.push(`Linha ${n}: ${e.message}`);
      }
    });
  return { validas, erros, ignoradas };
}
