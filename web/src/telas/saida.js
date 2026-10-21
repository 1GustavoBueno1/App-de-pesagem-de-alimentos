// Registrar saída: data, alimento, recipiente e peso bruto, com prévia do custo.
import { el } from '../dom.js';
import { D, lerPeso, pesoLiquido, custoAlimento, custoProducao } from '../calculos.js';
import { diaSP } from '../datas.js';
import { dinheiro, peso, taxaPercentual } from '../formato.js';
import { campoData, campoSelecao, campoTexto, preencherOpcoes, criarAviso, executar, traduzirErro } from '../ui.js';

export function telaSaida(repo) {
  const aviso = criarAviso();
  const data = campoData('Data', diaSP());
  const alimento = campoSelecao('Alimento');
  const recipiente = campoSelecao('Recipiente');
  const pesoBruto = campoTexto('Peso bruto (kg)', { decimal: true });
  const previa = el('p', { class: 'previa', 'aria-live': 'polite' });
  const botao = el('button', { type: 'submit', class: 'primario' }, 'Registrar saída');
  let alimentos = [];
  let recipientes = [];
  let taxa = null;

  async function carregar() {
    [alimentos, recipientes, taxa] = await Promise.all([repo.alimentos(), repo.recipientes(), repo.taxa()]);
    preencherOpcoes(alimento.input, alimentos.map((a) => ({ valor: a.id, texto: a.nome })), { vazio: 'Escolha…' });
    preencherOpcoes(
      recipiente.input,
      recipientes.map((r) => ({ valor: r.id, texto: `${r.nome} (${peso(r.tara)})` })),
      { vazio: 'Escolha…' },
    );
    if (alimentos.length === 0 || recipientes.length === 0 || taxa === null) {
      aviso.erro('Cadastre alimentos, recipientes e a taxa em Cadastros antes de registrar saídas.');
    }
    alimento.input.focus();
  }

  // Ao escolher o alimento, já seleciona o recipiente padrão dele.
  alimento.input.addEventListener('change', () => {
    const a = alimentos.find((x) => x.id === alimento.input.value);
    if (a?.recipiente_padrao_id) recipiente.input.value = a.recipiente_padrao_id;
    atualizarPrevia();
  });
  recipiente.input.addEventListener('change', atualizarPrevia);
  pesoBruto.input.addEventListener('input', atualizarPrevia);

  // Prévia silenciosa: só aparece quando os dados já formam uma saída válida.
  function atualizarPrevia() {
    previa.textContent = '';
    const a = alimentos.find((x) => x.id === alimento.input.value);
    const r = recipientes.find((x) => x.id === recipiente.input.value);
    if (!a || !r || taxa === null) return;
    try {
      const liquido = pesoLiquido(lerPeso(pesoBruto.input.value), D(r.tara));
      const custoA = custoAlimento(liquido, D(a.preco_kg));
      const custoP = custoProducao(liquido, D(a.preco_kg), D(taxa));
      previa.textContent =
        `Peso líquido ${peso(liquido)} · Custo do alimento ${dinheiro(custoA)} · ` +
        `Custo de produção ${dinheiro(custoP)} (taxa ${taxaPercentual(taxa)})`;
    } catch {
      // Ainda incompleto ou inválido: o erro aparece ao registrar.
    }
  }

  const form = el(
    'form',
    { class: 'cartao formulario', novalidate: true },
    data.bloco,
    alimento.bloco,
    recipiente.bloco,
    pesoBruto.bloco,
    previa,
    botao,
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, botao, async () => {
      const s = await repo.criarSaida({
        data: data.input.value,
        alimentoId: alimento.input.value,
        recipienteId: recipiente.input.value,
        pesoBruto: pesoBruto.input.value,
      });
      aviso.ok(`Saída registrada: ${s.alimento_nome}, ${pesoBruto.input.value.trim()} kg bruto.`);
      pesoBruto.input.value = '';
      previa.textContent = '';
      alimento.input.focus();
    });
  });

  carregar().catch((e) => aviso.erro(traduzirErro(e)));
  return el('div', {}, aviso.elemento, form);
}
