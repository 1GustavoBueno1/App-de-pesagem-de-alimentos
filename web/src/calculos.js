// Porte de calculos.py. Dinheiro e peso são sempre Decimal (decimal.js), nunca Number.
import Decimal from 'decimal.js';

// Mesma precisão padrão do Python (28 dígitos) e arredondamento ROUND_HALF_UP.
const Dec = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/** Cria um Decimal a partir de string (ou Decimal). */
export const D = (valor) => new Dec(valor);

// Número decimal simples: dígitos com ponto opcional. Recusa de propósito o que o
// decimal.js aceitaria a mais (hexadecimal "0x10", notação científica "1e3", etc.).
const NUMERO = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function exigirDecimal(valor, campo) {
  if (!Decimal.isDecimal(valor)) {
    throw new Error(`${campo}: valor interno inválido (esperado Decimal, nunca Number).`);
  }
  if (!valor.isFinite()) {
    throw new Error(`${campo}: valor inválido.`);
  }
  return valor;
}

function lerNumero(texto, campo) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new Error(`${campo}: informe um valor.`);
  }
  const limpo = texto.trim().replace(',', '.');
  if (!NUMERO.test(limpo)) {
    throw new Error(`${campo}: "${texto.trim()}" não é um número válido.`);
  }
  return D(limpo);
}

export function lerPeso(texto, campo = 'Peso') {
  const valor = lerNumero(texto, campo);
  if (valor.lte(0)) {
    throw new Error(`${campo}: deve ser maior que zero.`);
  }
  return valor;
}

export function pesoLiquido(bruto, tara) {
  exigirDecimal(bruto, 'Peso bruto');
  exigirDecimal(tara, 'Tara');
  const liquido = bruto.minus(tara);
  if (liquido.lte(0)) {
    throw new Error('Peso bruto: precisa ser maior que a tara do recipiente.');
  }
  return liquido;
}

export function custoAlimento(liquido, precoKg) {
  exigirDecimal(liquido, 'Peso líquido');
  exigirDecimal(precoKg, 'Preço por kg');
  if (liquido.lte(0)) {
    throw new Error('Peso líquido: deve ser maior que zero.');
  }
  if (precoKg.lte(0)) {
    throw new Error('Preço por kg: deve ser maior que zero.');
  }
  return liquido.times(precoKg).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function custoProducao(pesoLiq, precoKg, taxa) {
  exigirDecimal(pesoLiq, 'Peso líquido');
  exigirDecimal(precoKg, 'Preço por kg');
  exigirDecimal(taxa, 'Taxa');
  if (pesoLiq.lte(0)) {
    throw new Error('Peso líquido: deve ser maior que zero.');
  }
  if (precoKg.lte(0)) {
    throw new Error('Preço por kg: deve ser maior que zero.');
  }
  if (taxa.lt(0)) {
    throw new Error('Taxa: não pode ser negativa.');
  }
  // Arredonda uma única vez, no fim.
  return precoKg.times(pesoLiq).times(taxa.plus(1)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function percentualSobra(sobra, saida) {
  exigirDecimal(sobra, 'Sobra');
  exigirDecimal(saida, 'Saída');
  if (saida.lte(0)) {
    throw new Error('Saída: precisa ser maior que zero.');
  }
  if (sobra.lt(0)) {
    throw new Error('Sobra: não pode ser negativa.');
  }
  if (sobra.gt(saida)) {
    throw new Error('Sobra: não pode ser maior que a saída.');
  }
  return sobra.div(saida).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
}

/** Lê um número >= 0 (tara, taxa, peso bruto da sobra). */
export function lerNaoNegativo(texto, campo) {
  const valor = lerNumero(texto, campo);
  if (valor.lt(0)) {
    throw new Error(`${campo}: não pode ser menor que zero.`);
  }
  return valor;
}

/** Lê um valor em reais digitado pelo usuário: > 0 e no máximo 2 casas decimais. */
export function lerValor(texto, campo = 'Valor') {
  const valor = lerNumero(texto, campo);
  if (valor.lte(0)) {
    throw new Error(`${campo}: deve ser maior que zero.`);
  }
  if (valor.decimalPlaces() > 2) {
    throw new Error(`${campo}: use no máximo 2 casas decimais (centavos).`);
  }
  return valor;
}

/**
 * Lê um valor em reais do jeito que se escreve no Brasil: "3.500,00", "R$ 3.500,00",
 * "3500", "3500,5" ou "3500.50". Um ponto seguido de exatamente 3 dígitos é separador de
 * milhar ("3.500" = 3500); seguido de 1 ou 2 dígitos é decimal ("3.5" = 3,5).
 * Aceita no máximo 2 casas decimais. Zero só com { permitirZero: true }.
 */
export function lerDinheiroBR(texto, campo = 'Valor', { permitirZero = false } = {}) {
  if (typeof texto !== 'string' || texto.trim() === '') throw new Error(`${campo}: informe um valor.`);
  const limpo = texto.trim().replace(/^R\$\s*/i, '');
  const invalido = () => new Error(`${campo}: "${texto.trim()}" não é um valor em reais válido.`);
  if (limpo === '') throw invalido();
  let normal;
  if (/^-/.test(limpo)) {
    if (!/^-\d+([.,]\d+)?$/.test(limpo)) throw invalido();
    throw new Error(permitirZero ? `${campo}: não pode ser negativo.` : `${campo}: deve ser maior que zero.`);
  }
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpo)) normal = limpo.replace(/\./g, '').replace(',', '.'); // 1.234.567,89
  else if (/^\d+,\d+$/.test(limpo)) normal = limpo.replace(',', '.'); // 3500,5
  else if (/^\d+(\.\d+)?$/.test(limpo)) normal = limpo; // 3500 | 3500.50
  else throw invalido();
  // Conta os dígitos como foram digitados: o Decimal "apara" zeros finais ("3,500" viraria 3,5).
  if ((normal.split('.')[1] ?? '').length > 2) throw new Error(`${campo}: use no máximo 2 casas decimais (centavos).`);
  const valor = D(normal);
  if (valor.lte(0) && !(permitirZero && valor.isZero())) throw new Error(`${campo}: deve ser maior que zero.`);
  return valor;
}

/** Soma os valores dos gastos (strings do Firestore ou Decimal), com 2 casas. */
export function totalGastos(valores) {
  let total = D(0);
  valores.forEach((v, i) => {
    const campo = `Gasto nº ${i + 1}`;
    const texto = Decimal.isDecimal(v) ? exigirDecimal(v, campo).toFixed() : v;
    total = total.plus(lerValor(texto, campo));
  });
  return total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
