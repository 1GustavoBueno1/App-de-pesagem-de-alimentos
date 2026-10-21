// Cadastros: taxa, recipientes e alimentos (formulário no topo, lista abaixo).
import { el, trocar } from '../dom.js';
import { D } from '../calculos.js';
import { dinheiro, peso, taxaPercentual } from '../formato.js';
import { semear } from '../seed.js';
import {
  campoTexto,
  campoSelecao,
  preencherOpcoes,
  criarAviso,
  executar,
  traduzirErro,
  confirmar,
  tabela,
} from '../ui.js';

export function telaCadastros(repo) {
  const area = el('div', { class: 'pilha' }, el('p', { class: 'aviso' }, 'Carregando…'));
  const aviso = criarAviso();

  async function desenhar() {
    const [recipientes, alimentos, taxa] = await Promise.all([repo.recipientes(), repo.alimentos(), repo.taxa()]);
    trocar(
      area,
      recipientes.length === 0 || taxa === null ? cartaoSeed(recipientes.length, taxa) : null,
      cartaoTaxa(taxa),
      cartaoRecipientes(recipientes),
      cartaoAlimentos(alimentos, recipientes),
    );
  }

  function cartaoSeed(qtd, taxa) {
    const botao = el('button', { type: 'button', class: 'primario' }, 'Criar dados iniciais');
    botao.addEventListener('click', () =>
      executar(aviso, botao, async () => {
        await semear(repo);
        await desenhar();
        aviso.ok('Dados iniciais criados.');
      }),
    );
    const falta = [qtd === 0 ? 'os 6 recipientes padrão' : null, taxa === null ? 'a taxa de 30%' : null]
      .filter(Boolean)
      .join(' e ');
    return el('section', { class: 'cartao' }, el('h3', {}, 'Dados iniciais'), el('p', {}, `Cria ${falta}.`), botao);
  }

  function cartaoTaxa(taxa) {
    const valorAtual = taxa === null ? '' : D(taxa).times(100).toFixed().replace('.', ',');
    const { input, bloco } = campoTexto('Taxa (%)', { decimal: true, value: valorAtual });
    const botao = el('button', { type: 'submit', class: 'primario' }, 'Salvar taxa');
    const form = el('form', { class: 'linha-form', novalidate: true }, bloco, botao);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executar(aviso, botao, async () => {
        const salvo = await repo.salvarTaxaPercentual(input.value);
        await desenhar();
        aviso.ok(`Taxa salva: ${taxaPercentual(salvo)}. Vale para as próximas saídas.`);
      });
    });
    return el(
      'section',
      { class: 'cartao' },
      el('h3', {}, 'Taxa'),
      el('p', { class: 'aviso' }, 'Custo de produção = peso líquido × preço/kg × (1 + taxa).'),
      form,
    );
  }

  function cartaoRecipientes(recipientes) {
    const nome = campoTexto('Nome', { maxlength: 60 });
    const tara = campoTexto('Tara (kg)', { decimal: true });
    let editando = null;
    const { form, botao, cancelar } = formularioCadastro([nome.bloco, tara.bloco], () => {
      editando = null;
      nome.input.value = '';
      tara.input.value = '';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executar(aviso, botao, async () => {
        const r = await repo.salvarRecipiente({ id: editando, nome: nome.input.value, tara: tara.input.value });
        await desenhar();
        aviso.ok(`Recipiente "${r.nome}" salvo.`);
      });
    });

    const linhas = recipientes.map((r) =>
      el(
        'tr',
        {},
        el('td', {}, r.nome),
        el('td', { class: 'num' }, peso(r.tara)),
        el(
          'td',
          { class: 'acoes' },
          botaoEditar(() => {
            editando = r.id;
            nome.input.value = r.nome;
            tara.input.value = r.tara.replace('.', ',');
            botao.textContent = 'Salvar alteração';
            cancelar.hidden = false;
            nome.input.focus();
          }),
          botaoApagar(`Apagar o recipiente "${r.nome}"?`, () => repo.apagarRecipiente(r.id), `Recipiente "${r.nome}" apagado.`),
        ),
      ),
    );
    return el(
      'section',
      { class: 'cartao' },
      el('h3', {}, 'Recipientes'),
      form,
      recipientes.length ? tabela(['Nome', 'Tara', 'Ações'], linhas) : el('p', { class: 'aviso' }, 'Nenhum recipiente.'),
    );
  }

  function cartaoAlimentos(alimentos, recipientes) {
    const nome = campoTexto('Nome', { maxlength: 60 });
    const preco = campoTexto('Preço por kg (R$)', { decimal: true });
    const padrao = campoSelecao('Recipiente padrão (opcional)');
    const opcoesRecipientes = recipientes.map((r) => ({ valor: r.id, texto: r.nome }));
    preencherOpcoes(padrao.input, opcoesRecipientes, { vazio: '(nenhum)' });
    let editando = null;
    const { form, botao, cancelar } = formularioCadastro([nome.bloco, preco.bloco, padrao.bloco], () => {
      editando = null;
      nome.input.value = '';
      preco.input.value = '';
      padrao.input.value = '';
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      executar(aviso, botao, async () => {
        const a = await repo.salvarAlimento({
          id: editando,
          nome: nome.input.value,
          precoKg: preco.input.value,
          recipientePadraoId: padrao.input.value,
        });
        await desenhar();
        aviso.ok(`Alimento "${a.nome}" salvo.`);
      });
    });

    const nomeRecipiente = new Map(recipientes.map((r) => [r.id, r.nome]));
    const linhas = alimentos.map((a) =>
      el(
        'tr',
        {},
        el('td', {}, a.nome),
        el('td', { class: 'num' }, dinheiro(a.preco_kg)),
        el('td', {}, nomeRecipiente.get(a.recipiente_padrao_id) ?? '—'),
        el(
          'td',
          { class: 'acoes' },
          botaoEditar(() => {
            editando = a.id;
            nome.input.value = a.nome;
            preco.input.value = a.preco_kg.replace('.', ',');
            padrao.input.value = a.recipiente_padrao_id ?? '';
            botao.textContent = 'Salvar alteração';
            cancelar.hidden = false;
            nome.input.focus();
          }),
          botaoApagar(`Apagar o alimento "${a.nome}"?`, () => repo.apagarAlimento(a.id), `Alimento "${a.nome}" apagado.`),
        ),
      ),
    );
    return el(
      'section',
      { class: 'cartao' },
      el('h3', {}, 'Alimentos'),
      form,
      alimentos.length
        ? tabela(['Nome', 'Preço/kg', 'Recipiente padrão', 'Ações'], linhas)
        : el('p', { class: 'aviso' }, 'Nenhum alimento.'),
    );
  }

  // Formulário com "Salvar" e "Cancelar" (o Cancelar e o Esc saem do modo edição).
  function formularioCadastro(blocos, limpar) {
    const botao = el('button', { type: 'submit', class: 'primario' }, 'Adicionar');
    const cancelar = el('button', { type: 'button', hidden: true }, 'Cancelar');
    const sairEdicao = () => {
      limpar();
      botao.textContent = 'Adicionar';
      cancelar.hidden = true;
    };
    cancelar.addEventListener('click', sairEdicao);
    const form = el('form', { class: 'linha-form', novalidate: true }, blocos, el('div', { class: 'botoes' }, botao, cancelar));
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !cancelar.hidden) sairEdicao();
    });
    return { form, botao, cancelar };
  }

  const botaoEditar = (acao) => el('button', { type: 'button', onclick: acao }, 'Editar');

  function botaoApagar(pergunta, acao, sucesso) {
    const botao = el('button', { type: 'button', class: 'perigo-leve' }, 'Apagar');
    botao.addEventListener('click', async () => {
      if (!(await confirmar(pergunta))) return;
      await executar(aviso, botao, async () => {
        await acao();
        await desenhar();
        aviso.ok(sucesso);
      });
    });
    return botao;
  }

  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  return el('div', {}, el('h2', {}, 'Cadastros'), aviso.elemento, area);
}
