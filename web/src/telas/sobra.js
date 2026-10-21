// Registrar sobra: escolhe uma saída do dia que ainda não tem sobra e informa o peso
// bruto, pesado no mesmo recipiente da saída.
import { el } from '../dom.js';
import { D, lerNaoNegativo, pesoLiquido, percentualSobra } from '../calculos.js';
import { diaSP } from '../datas.js';
import { peso, percentual } from '../formato.js';
import { campoData, campoSelecao, campoTexto, preencherOpcoes, criarAviso, executar, traduzirErro, criarVisor } from '../ui.js';

export function telaSobra(repo) {
  const aviso = criarAviso();
  const data = campoData('Data', diaSP());
  const saida = campoSelecao('Saída');
  const pesoBruto = campoTexto('Peso bruto da sobra (kg)', { decimal: true });
  const visor = criarVisor([
    { chave: 'sobra', rotulo: 'Sobra' },
    { chave: 'pct', rotulo: 'Da saída' },
  ]);
  const botao = el('button', { type: 'submit', class: 'primario' }, 'Registrar sobra');
  let pendentes = [];

  async function carregar() {
    aviso.limpar();
    const saidas = await repo.saidasDoDia(data.input.value);
    const sobras = await repo.sobrasDe(saidas.map((s) => s.id));
    pendentes = saidas.filter((s) => !sobras.has(s.id));
    preencherOpcoes(
      saida.input,
      pendentes.map((s) => ({
        valor: s.id,
        texto: `${s.alimento_nome} · ${s.recipiente_nome} · ${peso(D(s.peso_bruto).minus(D(s.tara)))}`,
      })),
      { vazio: pendentes.length ? 'Escolha…' : 'Nenhuma saída sem sobra nesta data' },
    );
    atualizarPrevia();
  }

  function atualizarPrevia() {
    const s = pendentes.find((x) => x.id === saida.input.value);
    visor.definir(null);
    if (!s) return;
    const tara = D(s.tara);
    const nota = `Pese no mesmo recipiente: ${s.recipiente_nome}, tara ${peso(tara)}`;
    visor.definir(null, nota);
    try {
      const kg = lerNaoNegativo(pesoBruto.input.value, 'Peso').minus(tara);
      const pct = percentualSobra(kg, pesoLiquido(D(s.peso_bruto), tara));
      visor.definir({ sobra: peso(kg), pct: percentual(pct) }, nota);
    } catch {
      // incompleto ou inválido: o erro aparece ao registrar
    }
  }

  data.input.addEventListener('change', () => carregar().catch((e) => aviso.erro(traduzirErro(e))));
  saida.input.addEventListener('change', atualizarPrevia);
  pesoBruto.input.addEventListener('input', atualizarPrevia);

  const form = el(
    'form',
    { class: 'cartao formulario', novalidate: true },
    data.bloco,
    saida.bloco,
    pesoBruto.bloco,
    visor.elemento,
    botao,
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, botao, async () => {
      const s = pendentes.find((x) => x.id === saida.input.value);
      if (!s) throw new Error('Saída: escolha uma saída da lista.');
      await repo.salvarSobra(s, pesoBruto.input.value, false);
      pesoBruto.input.value = '';
      await carregar();
      aviso.ok(`Sobra registrada: ${s.alimento_nome}.`);
      saida.input.focus();
    });
  });

  carregar()
    .then(() => saida.input.focus())
    .catch((e) => aviso.erro(traduzirErro(e)));
  return el('div', {}, aviso.elemento, form);
}
