// Datas como string AAAA-MM-DD no fuso de São Paulo. Nunca use toISOString() para
// saber o dia: ele usa UTC e erra entre 21h e 0h.

const FORMATO_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Dia (AAAA-MM-DD) em São Paulo para o instante dado (padrão: agora). */
export function diaSP(instante = new Date()) {
  return FORMATO_SP.format(instante); // en-CA já formata como AAAA-MM-DD
}

/** "2026-10-21" -> "21/10/2026". */
export function formatarData(dia) {
  const [a, m, d] = dia.split('-');
  return `${d}/${m}/${a}`;
}

function diasNoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Primeiro e último dia do mês do dia dado. */
export function mesDe(dia) {
  const [a, m] = dia.split('-');
  const fim = String(diasNoMes(Number(a), Number(m))).padStart(2, '0');
  return { inicio: `${a}-${m}-01`, fim: `${a}-${m}-${fim}` };
}

/** Confere formato e se o dia existe (recusa 30/02). */
export function dataValida(dia) {
  if (typeof dia !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const [a, m, d] = dia.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(a, m);
}
