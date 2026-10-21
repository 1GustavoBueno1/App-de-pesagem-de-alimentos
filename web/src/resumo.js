// Linhas e totais de um dia, calculados a partir das cópias guardadas em cada saída.
import { D, pesoLiquido, custoProducao, percentualSobra } from './calculos.js';

/**
 * @param saidas lista de saídas do Firestore (valores como string)
 * @param sobras Map idDaSaida -> { peso_bruto }
 */
export function resumirDia(saidas, sobras) {
  const linhas = saidas.map((s) => {
    const tara = D(s.tara);
    const liquido = pesoLiquido(D(s.peso_bruto), tara);
    const custo = custoProducao(liquido, D(s.preco_kg), D(s.taxa));
    const registro = sobras.get(s.id);
    let sobra = null;
    let pct = null;
    if (registro) {
      sobra = D(registro.peso_bruto).minus(tara);
      pct = percentualSobra(sobra, liquido);
    }
    return { saida: s, liquido, custo, sobra, percentual: pct };
  });

  // Totais = soma exata do que aparece em cada linha (custos já arredondados).
  const totais = linhas.reduce(
    (t, l) => ({
      liquido: t.liquido.plus(l.liquido),
      custo: t.custo.plus(l.custo),
      sobra: l.sobra ? t.sobra.plus(l.sobra) : t.sobra,
    }),
    { liquido: D(0), custo: D(0), sobra: D(0) },
  );
  return { linhas, totais };
}
