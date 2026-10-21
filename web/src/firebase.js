// Inicializa o Firebase (Auth + Firestore). Com "npm run dev:emulador" usa os
// emuladores locais e um projeto de demonstração, sem tocar no projeto real.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

const usarEmulador = import.meta.env.VITE_EMULADOR === 'true';

// Projetos com prefixo "demo-" só existem nos emuladores.
const CONFIG_EMULADOR = { apiKey: 'demo', projectId: 'demo-custos-cozinha' };

function configuracao() {
  if (usarEmulador) return CONFIG_EMULADOR;
  const faltando = Object.entries(firebaseConfig)
    .filter(([, valor]) => !valor || valor === 'COLE_AQUI')
    .map(([chave]) => chave);
  if (faltando.length > 0) {
    throw new Error(
      `Configuração do Firebase incompleta em src/firebase-config.js: ${faltando.join(', ')}.`,
    );
  }
  return firebaseConfig;
}

export const app = initializeApp(configuracao());
export const auth = getAuth(app);
export const db = getFirestore(app);

if (usarEmulador) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
