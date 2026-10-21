// Peças de interface reutilizadas pelas telas. Tudo montado com el() (textContent).
import { el } from './dom.js';

let contador = 0;
const novoId = (prefixo) => `${prefixo}-${++contador}`;

/** Campo de texto com rótulo. Números usam type=text + inputmode=decimal (aceita vírgula). */
export function campoTexto(rotulo, { decimal = false, ...atributos } = {}) {
  const input = el('input', {
    id: novoId('campo'),
    type: 'text',
    autocomplete: 'off',
    ...(decimal ? { inputmode: 'decimal' } : {}),
    ...atributos,
  });
  return { input, bloco: el('div', { class: 'campo' }, el('label', { for: input.id }, rotulo), input) };
}

export function campoData(rotulo, valor) {
  const input = el('input', { id: novoId('data'), type: 'date', value: valor, required: true });
  return { input, bloco: el('div', { class: 'campo' }, el('label', { for: input.id }, rotulo), input) };
}

export function campoSelecao(rotulo) {
  const input = el('select', { id: novoId('sel') });
  return { input, bloco: el('div', { class: 'campo' }, el('label', { for: input.id }, rotulo), input) };
}

/** Preenche um <select>. itens: [{ valor, texto }]. */
export function preencherOpcoes(select, itens, { vazio = null, selecionado = '' } = {}) {
  const opcoes = itens.map((i) => el('option', { value: i.valor }, i.texto));
  if (vazio !== null) opcoes.unshift(el('option', { value: '' }, vazio));
  select.replaceChildren(...opcoes);
  select.value = selecionado ?? '';
}

/** Área de mensagens (sucesso/erro) lida por leitores de tela. */
export function criarAviso() {
  const p = el('p', { class: 'aviso-acao', role: 'status', 'aria-live': 'polite' });
  return {
    elemento: p,
    ok(texto) {
      p.className = 'aviso-acao ok';
      p.textContent = texto;
    },
    erro(texto) {
      p.className = 'aviso-acao erro';
      p.textContent = texto;
    },
    limpar() {
      p.className = 'aviso-acao';
      p.textContent = '';
    },
  };
}

/** Roda uma ação de botão/formulário mostrando o erro (com campo e regra) no aviso. */
export async function executar(aviso, botao, acao) {
  aviso.limpar();
  if (botao) botao.disabled = true;
  try {
    return await acao();
  } catch (e) {
    aviso.erro(traduzirErro(e));
    return undefined;
  } finally {
    if (botao) botao.disabled = false;
  }
}

export function traduzirErro(e) {
  if (e?.code === 'permission-denied') return 'Sem permissão: esta conta não tem acesso a estes dados.';
  if (e?.code === 'unavailable') return 'Sem conexão com o servidor. Tente de novo.';
  return e?.message ?? String(e);
}

/** Janela de confirmação. Enter confirma, Esc cancela. Resolve true/false. */
export function confirmar(mensagem, textoBotao = 'Apagar') {
  return new Promise((resolver) => {
    const sim = el('button', { type: 'submit', class: 'perigo', value: 'sim' }, textoBotao);
    const nao = el('button', { type: 'submit', value: 'nao', formnovalidate: true }, 'Cancelar');
    const janela = el(
      'dialog',
      { class: 'janela' },
      el('form', { method: 'dialog' }, el('p', {}, mensagem), el('div', { class: 'botoes' }, nao, sim)),
    );
    janela.addEventListener('close', () => {
      janela.remove();
      resolver(janela.returnValue === 'sim');
    });
    document.body.append(janela);
    janela.showModal();
    nao.focus(); // o padrão seguro é cancelar
  });
}

/** Janela com formulário. montar(form, fechar) adiciona os campos; Esc fecha. */
export function janelaFormulario(titulo, montar) {
  const form = el('form', { novalidate: true });
  const janela = el('dialog', { class: 'janela' }, el('h3', {}, titulo), form);
  const fechar = () => janela.close();
  janela.addEventListener('close', () => janela.remove());
  montar(form, fechar);
  document.body.append(janela);
  janela.showModal();
  return janela;
}

/** Tabela com rolagem própria (não cria rolagem horizontal na página). */
export function tabela(cabecalhos, linhas, rodape = null) {
  return el(
    'div',
    { class: 'tabela-rolagem' },
    el(
      'table',
      {},
      el('thead', {}, el('tr', {}, cabecalhos.map((c) => el('th', { scope: 'col' }, c)))),
      el('tbody', {}, linhas),
      rodape ? el('tfoot', {}, rodape) : null,
    ),
  );
}
