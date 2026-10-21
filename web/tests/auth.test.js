import { describe, it, expect } from 'vitest';
import { validarLogin, mensagemErroLogin, MSG_CREDENCIAIS } from '../src/auth.js';

describe('validarLogin', () => {
  it('devolve e-mail sem espaços e a senha intacta', () => {
    expect(validarLogin('  dono@exemplo.com ', ' s e n h a ')).toEqual({
      email: 'dono@exemplo.com',
      senha: ' s e n h a ',
    });
  });
  it('exige e-mail', () => expect(() => validarLogin('  ', 'x')).toThrow('E-mail: informe o e-mail.'));
  it('exige senha', () => expect(() => validarLogin('a@b.com', '')).toThrow('Senha: informe a senha.'));
});

describe('mensagemErroLogin', () => {
  // Mesma mensagem para senha errada e conta inexistente: não revela quais e-mails existem.
  it.each([
    'auth/invalid-credential',
    'auth/wrong-password',
    'auth/user-not-found',
    'auth/invalid-email',
    'auth/user-disabled',
    'auth/qualquer-outro',
  ])('%s vira a mensagem genérica', (code) => {
    expect(mensagemErroLogin({ code })).toBe(MSG_CREDENCIAIS);
  });
  it('mensagem genérica é "E-mail ou senha inválidos."', () =>
    expect(MSG_CREDENCIAIS).toBe('E-mail ou senha inválidos.'));
  it('erro sem código vira a mensagem genérica', () => expect(mensagemErroLogin(undefined)).toBe(MSG_CREDENCIAIS));
  it('sem internet tem mensagem própria', () =>
    expect(mensagemErroLogin({ code: 'auth/network-request-failed' })).toMatch(/conexão/));
  it('excesso de tentativas tem mensagem própria', () =>
    expect(mensagemErroLogin({ code: 'auth/too-many-requests' })).toMatch(/Muitas tentativas/));
});
