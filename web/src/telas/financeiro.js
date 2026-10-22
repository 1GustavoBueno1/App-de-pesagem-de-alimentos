// Gastos e Salários: duas abas dentro da seção "Gastos" (#gastos e #gastos/salarios).
import { el } from '../dom.js';
import { telaGastos } from './gastos.js';
import { telaSalarios } from './salarios.js';

const ABAS = [
  { id: 'gastos', nome: 'Gastos', href: '#gastos', tela: (repo) => telaGastos(repo) },
  { id: 'salarios', nome: 'Salários', href: '#gastos/salarios', tela: (repo) => telaSalarios(repo) },
];

export function telaFinanceiro(repo, sub) {
  const atual = ABAS.find((a) => a.id === sub) ?? ABAS[0];
  const abas = ABAS.map((a) =>
    el('a', { href: a.href, class: 'aba', 'aria-current': a.id === atual.id ? 'page' : null }, a.nome),
  );
  return el('div', {}, el('nav', { class: 'subabas', 'aria-label': 'Gastos e salários' }, abas), atual.tela(repo));
}
