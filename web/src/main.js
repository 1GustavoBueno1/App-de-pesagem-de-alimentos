// Ponto de entrada: toda tela exige login. Sem usuário, só existe a tela de login.
import './estilo.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase.js';
import { trocar } from './dom.js';
import { telaLogin } from './telas/login.js';
import { telaApp } from './telas/app.js';

const raiz = document.getElementById('app');

onAuthStateChanged(auth, (usuario) => {
  trocar(raiz, usuario ? telaApp(usuario) : telaLogin());
});
