// Ponto de entrada: toda tela exige login. Sem usuário, só existe a tela de login.
// Fontes servidas pelo próprio app (sem Google Fonts): nada de servidor externo.
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource-variable/manrope/wght.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
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
