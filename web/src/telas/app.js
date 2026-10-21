// Estrutura do app depois do login: barra do topo, navegação e botão Sair.
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { el, trocar } from '../dom.js';

const SECOES = [
  { id: 'pesagem', nome: 'Pesagem', etapa: 6 },
  { id: 'gastos', nome: 'Gastos', etapa: 8 },
  { id: 'cadastros', nome: 'Cadastros', etapa: 5 },
];

function secaoAtual() {
  const id = location.hash.slice(1);
  return SECOES.find((s) => s.id === id) ?? SECOES[0];
}

export function telaApp(usuario) {
  const conteudo = el('main', { id: 'conteudo', tabindex: '-1' });
  const botoes = SECOES.map((s) =>
    el('a', { href: `#${s.id}`, class: 'aba', 'data-secao': s.id }, s.nome),
  );

  function mostrar() {
    const secao = secaoAtual();
    for (const b of botoes) {
      if (b.dataset.secao === secao.id) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    trocar(
      conteudo,
      el('h2', {}, secao.nome),
      el('p', { class: 'aviso' }, `Esta tela será construída na etapa ${secao.etapa}.`),
    );
  }

  const sair = el(
    'button',
    {
      type: 'button',
      class: 'secundario',
      onclick: async () => {
        sair.disabled = true;
        await signOut(auth); // main.js volta para o login.
      },
    },
    'Sair',
  );

  window.onhashchange = mostrar; // atribuição (não addEventListener) para não acumular após novo login
  mostrar();

  return el(
    'div',
    { class: 'app' },
    el(
      'header',
      { class: 'topo' },
      el('span', { class: 'marca' }, 'Custos da Cozinha'),
      el('nav', { 'aria-label': 'Seções' }, botoes),
      el('span', { class: 'usuario' }, usuario.email ?? ''),
      sair,
    ),
    conteudo,
  );
}
