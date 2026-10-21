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
  // No navegador, Enter numa lista não envia o formulário. Aqui ele avança para o
  // próximo campo e, se a lista for o último campo, envia.
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !input.form) return;
    e.preventDefault();
    const campos = [...input.form.elements].filter((c) => !c.disabled && !c.hidden && c.type !== 'hidden');
    const proximo = campos[campos.indexOf(input) + 1];
    if (!proximo || proximo.type === 'submit') input.form.requestSubmit();
    else proximo.focus();
  });
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

/**
 * Visor no estilo de balança: painel com rótulos e valores grandes.
 * campos: [{ chave, rotulo }]. definir({ chave: 'texto' } | null, nota?) troca os valores.
 */
export function criarVisor(campos, { destaque = false } = {}) {
  const valores = new Map();
  const celulas = campos.map(({ chave, rotulo }) => {
    const valor = el('span', { class: 'visor-valor vazio' }, '—');
    valores.set(chave, valor);
    return el('div', { class: 'visor-celula' }, el('span', { class: 'visor-rotulo' }, rotulo), valor);
  });
  const nota = el('p', { class: 'visor-nota' });
  const elemento = el(
    'div',
    { class: destaque ? 'visor visor-destaque' : 'visor', role: 'status', 'aria-live': 'polite' },
    el('div', { class: 'visor-celulas' }, celulas),
    nota,
  );
  return {
    elemento,
    definir(dados, textoNota = '') {
      for (const [chave, valor] of valores) {
        const texto = dados?.[chave];
        valor.textContent = texto ?? '—';
        valor.classList.toggle('vazio', texto === undefined || texto === null);
      }
      nota.textContent = textoNota;
    },
  };
}

/**
 * Tabela com rolagem própria. No celular vira cartões: cada célula recebe o nome da
 * coluna em data-rotulo, mostrado pelo CSS (attr() só exibe texto, nunca HTML).
 */
export function tabela(cabecalhos, linhas, rodape = null) {
  // Coluna numérica (td.num na primeira linha) também alinha o título à direita.
  const numericas = new Set();
  [...(linhas[0]?.children ?? [])].forEach((c, i) => c.classList.contains('num') && numericas.add(i));
  for (const tr of linhas) {
    let coluna = 0;
    for (const celula of tr.children) {
      if (celula.tagName === 'TD' && cabecalhos[coluna]) celula.dataset.rotulo = cabecalhos[coluna];
      coluna += Number(celula.getAttribute('colspan') ?? 1);
    }
  }
  return el(
    'div',
    { class: 'tabela-rolagem' },
    el(
      'table',
      {},
      el('thead', {}, el('tr', {}, cabecalhos.map((c, i) => el('th', { scope: 'col', class: numericas.has(i) ? 'num' : null }, c)))),
      el('tbody', {}, linhas),
      rodape ? el('tfoot', {}, rodape) : null,
    ),
  );
}
