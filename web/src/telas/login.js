// Tela de login (e-mail e senha). Não existe tela de cadastro: a conta é criada no
// console do Firebase.
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { validarLogin, mensagemErroLogin } from '../auth.js';
import { el } from '../dom.js';

export function telaLogin() {
  const email = el('input', {
    id: 'login-email',
    type: 'email',
    autocomplete: 'username',
    inputmode: 'email',
    required: true,
  });
  const senha = el('input', {
    id: 'login-senha',
    type: 'password',
    autocomplete: 'current-password',
    required: true,
  });
  const erro = el('p', { class: 'erro', role: 'alert', 'aria-live': 'assertive' });
  const botao = el('button', { type: 'submit', class: 'primario' }, 'Entrar');

  async function entrar(evento) {
    evento.preventDefault();
    erro.textContent = '';
    let dados;
    try {
      dados = validarLogin(email.value, senha.value);
    } catch (e) {
      erro.textContent = e.message;
      (email.value.trim() === '' ? email : senha).focus();
      return;
    }
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    try {
      await signInWithEmailAndPassword(auth, dados.email, dados.senha);
      // A troca de tela acontece em main.js (onAuthStateChanged).
    } catch (e) {
      erro.textContent = mensagemErroLogin(e);
      senha.value = '';
      senha.focus();
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  }

  const formulario = el(
    'form',
    { class: 'cartao', novalidate: true, onsubmit: entrar },
    el('h1', {}, 'Custos da cozinha'),
    el('p', { class: 'aviso' }, 'Entre com o e-mail e a senha da conta da Dudu.'),
    el('label', { for: 'login-email' }, 'E-mail'),
    email,
    el('label', { for: 'login-senha' }, 'Senha'),
    senha,
    erro,
    botao,
  );
  queueMicrotask(() => email.focus());
  return el(
    'main',
    { class: 'tela-login' },
    el(
      'div',
      { class: 'login' },
      el('img', { class: 'login-logo', src: '/logo-dudu.png', alt: 'Dudu Bebidas', width: 168, height: 168 }),
      formulario,
    ),
  );
}
