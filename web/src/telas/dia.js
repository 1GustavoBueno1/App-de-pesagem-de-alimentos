// Tela de um dia: tabela das saídas com sobra, totais e observação.
// editavel = true  -> aba "Hoje" (abre em hoje, mas aceita outra data para corrigir dias anteriores)
// editavel = false -> aba "Relatórios" (só leitura, com o botão Gerar PDF)
import { el, trocar } from '../dom.js';
import { D } from '../calculos.js';
import { diaSP, formatarData } from '../datas.js';
import { dinheiro, peso, percentual, taxaPercentual } from '../formato.js';
import { resumirDia } from '../resumo.js';
import {
  campoData,
  campoSelecao,
  campoTexto,
  preencherOpcoes,
  criarAviso,
  executar,
  traduzirErro,
  confirmar,
  janelaFormulario,
  tabela,
} from '../ui.js';

const virgula = (texto) => texto.replace('.', ',');

export function telaDia(repo, { editavel }) {
  const aviso = criarAviso();
  const data = campoData('Dia', diaSP());
  const titulo = el('h3', {});
  const area = el('div', { class: 'pilha' });
  let carregado = null; // dados do dia exibido, reaproveitados pelo PDF (sem nova leitura)

  async function desenhar() {
    const dia = data.input.value;
    titulo.textContent = dia === diaSP() ? `Hoje, ${formatarData(dia)}` : formatarData(dia);
    const saidas = await repo.saidasDoDia(dia);
    const [sobras, obs] = await Promise.all([repo.sobrasDe(saidas.map((s) => s.id)), repo.observacao(dia)]);
    const { linhas, totais } = resumirDia(saidas, sobras);
    carregado = { dia, saidas, sobras, observacao: obs, gastos: [] };
    trocar(
      area,
      linhas.length ? tabelaDoDia(linhas, totais, sobras) : el('p', { class: 'aviso' }, 'Nenhuma saída nesta data.'),
      editavel ? cartaoObservacao(dia, obs) : obs ? el('section', { class: 'cartao' }, el('h3', {}, 'Observação do dia'), el('p', { class: 'texto-livre' }, obs)) : null,
    );
  }

  function tabelaDoDia(linhas, totais, sobras) {
    const cab = ['Alimento', 'Recipiente', 'Peso líquido', ...(editavel ? [] : ['Preço/kg', 'Taxa']), 'Custo de produção', 'Sobra', '% sobra'];
    if (editavel) cab.push('Ações');
    const corpo = linhas.map((l) => {
      const s = l.saida;
      return el(
        'tr',
        {},
        el('td', {}, s.alimento_nome),
        el('td', {}, s.recipiente_nome),
        el('td', { class: 'num' }, peso(l.liquido)),
        editavel ? null : el('td', { class: 'num' }, dinheiro(s.preco_kg)),
        editavel ? null : el('td', { class: 'num' }, taxaPercentual(s.taxa)),
        el('td', { class: 'num' }, dinheiro(l.custo)),
        el('td', { class: 'num' }, l.sobra ? peso(l.sobra) : '—'),
        el('td', { class: 'num' }, l.percentual ? percentual(l.percentual) : '—'),
        editavel ? el('td', { class: 'acoes' }, acoesDaLinha(s, sobras.get(s.id))) : null,
      );
    });
    const rodape = el(
      'tr',
      {},
      el('th', { scope: 'row', colspan: 2 }, 'Totais'),
      el('td', { class: 'num' }, peso(totais.liquido)),
      editavel ? null : el('td', { colspan: 2 }),
      el('td', { class: 'num' }, dinheiro(totais.custo)),
      el('td', { class: 'num' }, peso(totais.sobra)),
      el('td', {}),
      editavel ? el('td', {}) : null,
    );
    return tabela(cab, corpo, rodape);
  }

  function acoesDaLinha(saida, sobra) {
    const editar = el('button', { type: 'button', onclick: () => editarSaida(saida) }, 'Editar');
    const apagar = el('button', { type: 'button', class: 'perigo-leve' }, 'Apagar');
    apagar.addEventListener('click', async () => {
      const extra = sobra ? ' A sobra registrada também será apagada.' : '';
      if (!(await confirmar(`Apagar a saída de ${saida.alimento_nome}?${extra}`))) return;
      await executar(aviso, apagar, async () => {
        await repo.apagarSaida(saida.id);
        await desenhar();
        aviso.ok(`Saída de ${saida.alimento_nome} apagada.`);
      });
    });
    const botaoSobra = el('button', { type: 'button', onclick: () => editarSobra(saida, sobra) }, sobra ? 'Editar sobra' : 'Registrar sobra');
    const apagarSobra = sobra ? el('button', { type: 'button', class: 'perigo-leve' }, 'Apagar sobra') : null;
    apagarSobra?.addEventListener('click', async () => {
      if (!(await confirmar(`Apagar a sobra de ${saida.alimento_nome}?`))) return;
      await executar(aviso, apagarSobra, async () => {
        await repo.apagarSobra(saida.id);
        await desenhar();
        aviso.ok(`Sobra de ${saida.alimento_nome} apagada.`);
      });
    });
    return [editar, apagar, botaoSobra, apagarSobra];
  }

  async function editarSaida(saida) {
    const [alimentos, recipientes] = await Promise.all([repo.alimentos(), repo.recipientes()]);
    janelaFormulario(`Editar saída: ${saida.alimento_nome}`, (form, fechar) => {
      const erro = criarAviso();
      const alimento = campoSelecao('Alimento');
      const recipiente = campoSelecao('Recipiente');
      preencherOpcoes(alimento.input, alimentos.map((a) => ({ valor: a.id, texto: a.nome })), { vazio: 'Escolha…', selecionado: saida.alimento_id });
      preencherOpcoes(recipiente.input, recipientes.map((r) => ({ valor: r.id, texto: r.nome })), { vazio: 'Escolha…', selecionado: saida.recipiente_id });
      const pesoBruto = campoTexto('Peso bruto (kg)', { decimal: true, value: virgula(saida.peso_bruto) });
      const preco = campoTexto('Preço por kg (R$)', { decimal: true, value: virgula(saida.preco_kg) });
      const tara = campoTexto('Tara (kg)', { decimal: true, value: virgula(saida.tara) });
      const taxa = campoTexto('Taxa (%)', { decimal: true, value: virgula(D(saida.taxa).times(100).toFixed()) });
      // Trocar alimento/recipiente traz o valor ATUAL do cadastro, que ainda pode ser mudado à mão.
      alimento.input.addEventListener('change', () => {
        const a = alimentos.find((x) => x.id === alimento.input.value);
        if (a) preco.input.value = virgula(a.preco_kg);
      });
      recipiente.input.addEventListener('change', () => {
        const r = recipientes.find((x) => x.id === recipiente.input.value);
        if (r) tara.input.value = virgula(r.tara);
      });
      const salvar = el('button', { type: 'submit', class: 'primario' }, 'Salvar');
      const cancelar = el('button', { type: 'button', onclick: fechar }, 'Cancelar');
      form.append(
        alimento.bloco,
        recipiente.bloco,
        pesoBruto.bloco,
        preco.bloco,
        tara.bloco,
        taxa.bloco,
        erro.elemento,
        el('div', { class: 'botoes' }, cancelar, salvar),
      );
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        executar(erro, salvar, async () => {
          await repo.editarSaida(saida.id, {
            alimentoId: alimento.input.value,
            recipienteId: recipiente.input.value,
            pesoBruto: pesoBruto.input.value,
            precoKg: preco.input.value,
            tara: tara.input.value,
            taxaPercentual: taxa.input.value,
          });
          fechar();
          await desenhar();
          aviso.ok('Saída alterada.');
        });
      });
      queueMicrotask(() => pesoBruto.input.focus());
    });
  }

  function editarSobra(saida, sobra) {
    janelaFormulario(`${sobra ? 'Editar' : 'Registrar'} sobra: ${saida.alimento_nome}`, (form, fechar) => {
      const erro = criarAviso();
      const pesoBruto = campoTexto('Peso bruto da sobra (kg)', { decimal: true, value: sobra ? virgula(sobra.peso_bruto) : '' });
      const salvar = el('button', { type: 'submit', class: 'primario' }, 'Salvar');
      const cancelar = el('button', { type: 'button', onclick: fechar }, 'Cancelar');
      form.append(
        el('p', { class: 'aviso' }, `Pesada em ${saida.recipiente_nome} (tara ${peso(saida.tara)}).`),
        pesoBruto.bloco,
        erro.elemento,
        el('div', { class: 'botoes' }, cancelar, salvar),
      );
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        executar(erro, salvar, async () => {
          await repo.salvarSobra(saida, pesoBruto.input.value, Boolean(sobra));
          fechar();
          await desenhar();
          aviso.ok(`Sobra de ${saida.alimento_nome} salva.`);
        });
      });
      queueMicrotask(() => pesoBruto.input.focus());
    });
  }

  function cartaoObservacao(dia, texto) {
    const id = `obs-${dia}`;
    const campo = el('textarea', { id, rows: 3, maxlength: 2000 });
    campo.value = texto;
    const botao = el('button', { type: 'submit' }, 'Salvar observação');
    const form = el('form', { class: 'cartao', novalidate: true }, el('label', { for: id }, 'Observação do dia'), campo, el('div', { class: 'botoes' }, botao));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executar(aviso, botao, async () => {
        await repo.salvarObservacao(dia, campo.value);
        aviso.ok('Observação salva.');
      });
    });
    return form;
  }

  data.input.addEventListener('change', () => {
    aviso.limpar();
    desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  });

  const pdf = editavel ? null : el('button', { type: 'button', class: 'primario' }, 'Gerar PDF');
  pdf?.addEventListener('click', () =>
    executar(aviso, pdf, async () => {
      if (!carregado || carregado.dia !== data.input.value) await desenhar();
      // jsPDF só é baixado quando o PDF é pedido (o app abre mais rápido).
      const [{ montarRelatorio }, { baixarPdf }] = await Promise.all([import('../relatorio.js'), import('../pdf.js')]);
      const relatorio = montarRelatorio(carregado);
      baixarPdf(relatorio);
      aviso.ok(`PDF gerado: ${relatorio.nomeArquivo}`);
    }),
  );

  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  return el(
    'div',
    {},
    el('div', { class: 'linha-form' }, data.bloco, pdf),
    aviso.elemento,
    titulo,
    area,
  );
}
