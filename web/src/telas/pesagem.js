// Pesagem: quatro abas (Registrar saída, Registrar sobra, Hoje, Relatórios).
import { el } from '../dom.js';
import { telaSaida } from './saida.js';
import { telaSobra } from './sobra.js';
import { telaDia } from './dia.js';

export const ABAS_PESAGEM = [
  { id: 'saida', nome: 'Registrar saída', tela: (repo) => telaSaida(repo) },
  { id: 'sobra', nome: 'Registrar sobra', tela: (repo) => telaSobra(repo) },
  { id: 'hoje', nome: 'Hoje', tela: (repo) => telaDia(repo, { editavel: true }) },
  { id: 'relatorios', nome: 'Relatórios', tela: (repo) => telaDia(repo, { editavel: false }) },
];

/** `permitidas`: IDs das abas que aparecem (sem ele, todas). */
export function telaPesagem(repo, abaId, permitidas) {
  const lista = permitidas ? ABAS_PESAGEM.filter((a) => permitidas.includes(a.id)) : ABAS_PESAGEM;
  const aba = lista.find((a) => a.id === abaId) ?? lista[0];
  const abas = lista.map((a) =>
    el('a', { href: `#pesagem/${a.id}`, class: 'aba', 'aria-current': a.id === aba.id ? 'page' : null }, a.nome),
  );
  return el(
    'div',
    {},
    el('h2', { class: 'visualmente-oculto' }, 'Pesagem'),
    el('nav', { class: 'subabas', 'aria-label': 'Pesagem' }, abas),
    aba.tela(repo),
  );
}
