// Regras do login (sem dependência do Firebase, para testar sem emulador).

export const MSG_CREDENCIAIS = 'E-mail ou senha inválidos.';

/** Confere se os campos foram preenchidos. Não valida o formato do e-mail aqui. */
export function validarLogin(email, senha) {
  const emailLimpo = String(email ?? '').trim();
  if (emailLimpo === '') throw new Error('E-mail: informe o e-mail.');
  if (!senha) throw new Error('Senha: informe a senha.');
  return { email: emailLimpo, senha };
}

/**
 * Traduz o erro do Firebase. Senha errada, conta inexistente, conta desativada e
 * e-mail malformado viram a mesma mensagem, para não revelar quais e-mails existem.
 */
export function mensagemErroLogin(erro) {
  switch (erro?.code) {
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Confira a rede e tente de novo.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
    default:
      return MSG_CREDENCIAIS;
  }
}
