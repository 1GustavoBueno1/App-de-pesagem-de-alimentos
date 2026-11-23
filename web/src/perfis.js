// Quem é quem. Os UIDs precisam ser iguais aos de firestore.rules (quem protege de verdade
// são as rules; aqui só se escolhe o que aparece na tela).

export const UID_DONO = '4n3QdXnAE2XtFwzxMedf0Jlee552';
export const UID_OPERADOR = 'YnBc0pPzKDNrVUTdnunFjVVTBpT2'; // rubens@gmail.com

/** 'operador' para a conta do Rubens; qualquer outra conta é tratada como dono. */
export function perfilDe(usuario) {
  return usuario?.uid === UID_OPERADOR ? 'operador' : 'dono';
}

/** Abas da Pesagem que o operador vê: só lançar saída e sobra. */
export const ABAS_OPERADOR = ['saida', 'sobra'];
