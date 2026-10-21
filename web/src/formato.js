// Conversão de Decimal para texto: na tela (pt-BR) e no Firestore (string com ponto).
// Não usa Number nem Intl.NumberFormat, para não passar por ponto flutuante.
import { D } from './calculos.js';

function comSeparadores(valor, casas) {
  const [inteiro, fracao] = D(valor).toFixed(casas).split('.');
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fracao === undefined ? agrupado : `${agrupado},${fracao}`;
}

/** Número pt-BR sem unidade (para tabelas cujo cabeçalho já diz a unidade). */
export const numero = (valor, casas) => comSeparadores(valor, casas);
export const dinheiro = (valor) => `R$ ${comSeparadores(valor, 2)}`;
export const peso = (valor) => `${comSeparadores(valor, 3)} kg`;
export const percentual = (valor) => `${comSeparadores(valor, 1)}%`;

/** Taxa guardada como fração ("0.30") exibida como "30%". */
export function taxaPercentual(taxa) {
  return `${D(taxa).times(100).toFixed().replace('.', ',')}%`;
}

/** Decimal -> string aceita pelas Security Rules (até 9 dígitos inteiros e 6 casas). */
export function paraFirestore(valor, campo) {
  const texto = D(valor).toFixed();
  const [inteiro, fracao = ''] = texto.replace('-', '').split('.');
  if (fracao.length > 6) throw new Error(`${campo}: use no máximo 6 casas decimais.`);
  if (inteiro.length > 9) throw new Error(`${campo}: valor grande demais.`);
  return texto;
}
