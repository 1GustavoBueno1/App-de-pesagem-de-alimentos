// Estrutura do app depois do login: barra do topo, navegação e botão Sair.
// Rotas pelo hash: #pesagem/saida, #pesagem/hoje, #cadastros, #gastos, #gastos/salarios...
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { el, trocar } from '../dom.js';
import { telaPesagem } from './pesagem.js';
import { telaCadastros } from './cadastros.js';
import { telaFinanceiro } from './financeiro.js';
import { perfilDe, ABAS_OPERADOR } from '../perfis.js';

const SECOES_DONO = [
  { id: 'pesagem', nome: 'Pesagem', tela: (repo, sub) => telaPesagem(repo, sub) },
  { id: 'gastos', nome: 'Gastos', tela: (repo, sub) => telaFinanceiro(repo, sub) },
  { id: 'cadastros', nome: 'Cadastros', tela: (repo) => telaCadastros(repo) },
];

// Operador: lança saída e sobra e cadastra alimentos (sem apagar). Nada de Gastos.
const SECOES_OPERADOR = [
  { id: 'pesagem', nome: 'Pesagem', tela: (repo, sub) => telaPesagem(repo, sub, ABAS_OPERADOR) },
  { id: 'cadastros', nome: 'Alimentos', tela: (repo) => telaCadastros(repo, { somenteAlimentos: true }) },
];

export function secoesDe(usuario) {
  return perfilDe(usuario) === 'operador' ? SECOES_OPERADOR : SECOES_DONO;
}

function rotaAtual(secoes) {
  const [id, sub] = location.hash.slice(1).split('/');
  return { secao: secoes.find((s) => s.id === id) ?? secoes[0], sub };
}

export function telaApp(usuario, repo) {
  const SECOES = secoesDe(usuario);
  const conteudo = el('main', { id: 'conteudo', tabindex: '-1' });
  const botoes = SECOES.map((s) => el('a', { href: `#${s.id}`, class: 'aba', 'data-secao': s.id }, s.nome));

  function mostrar() {
    const { secao, sub } = rotaAtual(SECOES);
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
      el(
        'a',
        { class: 'marca', href: '#pesagem' },
        el('img', { src: '/logo-dudu-192.png', alt: '', width: 44, height: 44 }),
        el('span', {}, el('span', { class: 'marca-nome' }, 'Dudu'), el('span', { class: 'marca-sub' }, 'Custos da cozinha')),
      ),
      el('nav', { class: 'secoes', 'aria-label': 'Seções' }, botoes),
      el('span', { class: 'usuario' }, usuario.email ?? ''),
      sair,
    ),
    conteudo,
  );
}
