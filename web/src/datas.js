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

const FORMATO_DATA_HORA_SP = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "21/10/2026 14:05" no fuso de São Paulo. */
export function dataHoraSP(instante = new Date()) {
  const p = Object.fromEntries(FORMATO_DATA_HORA_SP.formatToParts(instante).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Confere AAAA-MM (mês 01 a 12). */
export const mesValido = (mes) => typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

/** "2026-10" -> "outubro de 2026". */
export function rotuloMes(mes) {
  const [a, m] = mes.split('-');
  return `${NOMES_MES[Number(m) - 1]} de ${a}`;
}

/** Soma (ou subtrai) meses de um AAAA-MM: somarMes('2026-12', 1) -> '2027-01'. */
export function somarMes(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const indice = a * 12 + (m - 1) + n;
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
}
