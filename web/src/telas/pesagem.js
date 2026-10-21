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

export function telaPesagem(repo, abaId) {
  const aba = ABAS_PESAGEM.find((a) => a.id === abaId) ?? ABAS_PESAGEM[0];
  const abas = ABAS_PESAGEM.map((a) =>
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
