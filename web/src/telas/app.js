// Estrutura do app depois do login: barra do topo, navegação e botão Sair.
// Rotas pelo hash: #pesagem/saida, #pesagem/hoje, #cadastros, #gastos...
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { el, trocar } from '../dom.js';
import { telaPesagem } from './pesagem.js';
import { telaCadastros } from './cadastros.js';
import { telaGastos } from './gastos.js';

const SECOES = [
  { id: 'pesagem', nome: 'Pesagem', tela: (repo, sub) => telaPesagem(repo, sub) },
  { id: 'gastos', nome: 'Gastos', tela: (repo) => telaGastos(repo) },
  { id: 'cadastros', nome: 'Cadastros', tela: (repo) => telaCadastros(repo) },
];

function rotaAtual() {
  const [id, sub] = location.hash.slice(1).split('/');
  return { secao: SECOES.find((s) => s.id === id) ?? SECOES[0], sub };
}

export function telaApp(usuario, repo) {
  const conteudo = el('main', { id: 'conteudo', tabindex: '-1' });
  const botoes = SECOES.map((s) => el('a', { href: `#${s.id}`, class: 'aba', 'data-secao': s.id }, s.nome));

  function mostrar() {
    const { secao, sub } = rotaAtual();
    for (const b of botoes) {
      if (b.dataset.secao === secao.id) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    trocar(conteudo, secao.tela(repo, sub));
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
