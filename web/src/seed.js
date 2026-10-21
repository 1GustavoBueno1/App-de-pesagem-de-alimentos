// Dados iniciais: os 6 recipientes e a taxa de 30%. Pode rodar mais de uma vez:
// só cria o que ainda não existe (compara pelo nome) e nunca muda a taxa já cadastrada.
import { normalizar } from './repositorio.js';

export const RECIPIENTES_INICIAIS = [
  ['Panela de feijão', '3.8'],
  ['Cuba maior', '2.0'],
  ['Cuba menor', '1.5'],
  ['Cuba pequena', '0.3'],
  ['Caixote de frutas', '2.0'],
  ['Panela de pressão tradicional', '3.8'],
];

export const TAXA_INICIAL_PERCENTUAL = '30';

export async function semear(repo) {
  const existentes = new Set((await repo.recipientes()).map((r) => normalizar(r.nome)));
  for (const [nome, tara] of RECIPIENTES_INICIAIS) {
    if (!existentes.has(normalizar(nome))) await repo.salvarRecipiente({ nome, tara });
  }
  if ((await repo.taxa()) === null) await repo.salvarTaxaPercentual(TAXA_INICIAL_PERCENTUAL);
}
