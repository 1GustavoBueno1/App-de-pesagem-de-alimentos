// Ponto de entrada: toda tela exige login. Sem usuário, só existe a tela de login.
import './estilo.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase.js';
import { trocar } from './dom.js';
import { criarRepositorio } from './repositorio.js';
import { telaLogin } from './telas/login.js';
import { telaApp } from './telas/app.js';

const raiz = document.getElementById('app');

onAuthStateChanged(auth, (usuario) => {
  // Repositório novo a cada login: o cache da sessão anterior nunca é reaproveitado.
  trocar(raiz, usuario ? telaApp(usuario, criarRepositorio(db)) : telaLogin());
});
