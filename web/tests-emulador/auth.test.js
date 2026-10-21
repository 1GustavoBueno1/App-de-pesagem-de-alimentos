// Login real contra o emulador de Authentication.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { mensagemErroLogin, MSG_CREDENCIAIS } from '../src/auth.js';

const PROJETO = 'demo-custos-cozinha';
let app;
let auth;

beforeAll(async () => {
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${PROJETO}/accounts`, { method: 'DELETE' });
  app = initializeApp({ apiKey: 'demo', projectId: PROJETO }, 'teste-auth');
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await createUserWithEmailAndPassword(auth, 'dono@exemplo.com', 'senha-correta');
  await signOut(auth);
});

afterAll(() => deleteApp(app));

async function erroDoLogin(email, senha) {
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    return mensagemErroLogin(e);
  }
  throw new Error('o login deveria ter falhado');
}

describe('login no emulador', () => {
  it('entra com e-mail e senha corretos e sai', async () => {
    const { user } = await signInWithEmailAndPassword(auth, 'dono@exemplo.com', 'senha-correta');
    expect(user.email).toBe('dono@exemplo.com');
    await signOut(auth);
    expect(auth.currentUser).toBeNull();
  });

  it('senha errada e conta inexistente dão a MESMA mensagem', async () => {
    const senhaErrada = await erroDoLogin('dono@exemplo.com', 'errada');
    const semConta = await erroDoLogin('ninguem@exemplo.com', 'qualquer');
    expect(senhaErrada).toBe(MSG_CREDENCIAIS);
    expect(semConta).toBe(MSG_CREDENCIAIS);
  });
});
