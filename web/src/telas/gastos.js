// Gastos: formulário no topo, filtro por período (padrão: mês atual), total do período
// em destaque e lista com editar e apagar.
import { el, trocar } from '../dom.js';
import { totalGastos } from '../calculos.js';
import { diaSP, formatarData, mesDe } from '../datas.js';
import { dinheiro } from '../formato.js';
import { FORMAS_PAGAMENTO } from '../repositorio.js';
import {
  campoData,
  campoSelecao,
  campoTexto,
  preencherOpcoes,
  criarAviso,
  executar,
  traduzirErro,
  confirmar,
  tabela,
  criarVisor,
} from '../ui.js';

export function telaGastos(repo) {
  const aviso = criarAviso();

  // ---- Formulário
  const descricao = campoTexto('Descrição', { maxlength: 100, placeholder: 'ex.: gasolina' });
  const dataPagamento = campoData('Data de pagamento', diaSP());
  const valor = campoTexto('Valor (R$)', { decimal: true });
  const forma = campoSelecao('Forma de pagamento');
  preencherOpcoes(forma.input, FORMAS_PAGAMENTO.map((f) => ({ valor: f, texto: f })), { vazio: 'Escolha…' });
  const botao = el('button', { type: 'submit', class: 'primario' }, 'Adicionar gasto');
  const cancelar = el('button', { type: 'button', hidden: true }, 'Cancelar');
  let editando = null;

  function sairEdicao() {
    editando = null;
    descricao.input.value = '';
    valor.input.value = '';
    forma.input.value = '';
    dataPagamento.input.value = diaSP();
    botao.textContent = 'Adicionar gasto';
    cancelar.hidden = true;
  }
  cancelar.addEventListener('click', sairEdicao);

  const form = el(
    'form',
    { class: 'cartao linha-form', novalidate: true },
    descricao.bloco,
    dataPagamento.bloco,
    valor.bloco,
    forma.bloco,
    el('div', { class: 'botoes' }, botao, cancelar),
  );
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editando) sairEdicao();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, botao, async () => {
      const g = await repo.salvarGasto({
        id: editando,
        descricao: descricao.input.value,
        dataPagamento: dataPagamento.input.value,
        valor: valor.input.value,
        forma: forma.input.value,
      });
      sairEdicao();
      await desenhar();
      const fora = g.data_pagamento < inicio.input.value || g.data_pagamento > fim.input.value;
      aviso.ok(`Gasto "${g.descricao}" salvo.${fora ? ' Ele está fora do período filtrado.' : ''}`);
      descricao.input.focus();
    });
  });

  // ---- Filtro por período
  const mes = mesDe(diaSP());
  const inicio = campoData('De', mes.inicio);
  const fim = campoData('Até', mes.fim);
  const filtrar = el('button', { type: 'submit' }, 'Filtrar');
  const filtro = el('form', { class: 'linha-form', novalidate: true }, inicio.bloco, fim.bloco, filtrar);
  filtro.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, filtrar, desenhar);
  });

  const visorTotal = criarVisor([{ chave: 'total', rotulo: 'Total do período' }], { destaque: true });
  const area = el('div', {});

  async function desenhar() {
    const lista = await repo.gastosDoPeriodo(inicio.input.value, fim.input.value);
    // O total é a soma exatamente das linhas exibidas abaixo.
    const soma = totalGastos(lista.map((g) => g.valor));
    visorTotal.definir(
      { total: dinheiro(soma) },
      `${formatarData(inicio.input.value)} a ${formatarData(fim.input.value)} · ${lista.length} ${lista.length === 1 ? 'gasto' : 'gastos'}`,
    );
    const linhas = lista.map((g) =>
      el(
        'tr',
        {},
        el('td', {}, formatarData(g.data_pagamento)),
        el('td', {}, g.descricao),
        el('td', {}, g.forma_pagamento),
        el('td', { class: 'num' }, dinheiro(g.valor)),
        el('td', { class: 'acoes' }, botaoEditar(g), botaoApagar(g)),
      ),
    );
    trocar(
      area,
      lista.length
        ? tabela(['Data', 'Descrição', 'Forma', 'Valor', 'Ações'], linhas)
        : el('p', { class: 'aviso' }, 'Nenhum gasto neste período.'),
    );
  }

  function botaoEditar(g) {
    return el(
      'button',
      {
        type: 'button',
        onclick: () => {
          editando = g.id;
          descricao.input.value = g.descricao;
          dataPagamento.input.value = g.data_pagamento;
          valor.input.value = g.valor.replace('.', ',');
          forma.input.value = g.forma_pagamento;
          botao.textContent = 'Salvar alteração';
          cancelar.hidden = false;
          descricao.input.focus();
        },
      },
      'Editar',
    );
  }

  function botaoApagar(g) {
    const b = el('button', { type: 'button', class: 'perigo-leve' }, 'Apagar');
    b.addEventListener('click', async () => {
      if (!(await confirmar(`Apagar o gasto "${g.descricao}" de ${dinheiro(g.valor)}?`))) return;
      await executar(aviso, b, async () => {
        await repo.apagarGasto(g.id);
        if (editando === g.id) sairEdicao();
        await desenhar();
        aviso.ok(`Gasto "${g.descricao}" apagado.`);
      });
    });
    return b;
  }

  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  queueMicrotask(() => descricao.input.focus());
  return el(
    'div',
    {},
    el('h2', {}, 'Gastos'),
    aviso.elemento,
    form,
    el('section', { class: 'pilha' }, el('div', {}, filtro, visorTotal.elemento), area),
  );
}
