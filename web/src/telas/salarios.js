// Salários: folha de pagamento com salário, prêmio e lote de cada funcionário.
// O prêmio fica separado do salário porque é abatido do consumo do funcionário na empresa
// (não sai como pagamento em dinheiro), então o caixa vê os dois valores sem misturar.
import { el, trocar } from '../dom.js';
import { dinheiro } from '../formato.js';
import { LOTES, PRAZOS_LOTE, resumirFolha, resumirPagamentos, lerLinhasFolha } from '../folha.js';
import { diaSP, formatarData, rotuloMes, somarMes } from '../datas.js';
import {
  campoTexto,
  campoSelecao,
  preencherOpcoes,
  criarAviso,
  executar,
  traduzirErro,
  confirmar,
  tabela,
  criarVisor,
  janelaFormulario,
} from '../ui.js';

const virgula = (texto) => texto.replace('.', ',');
const textoLote = (lote) => `${lote} · ${PRAZOS_LOTE[lote].toLowerCase()}`;

export function telaSalarios(repo) {
  const aviso = criarAviso();
  let lista = [];
  let editando = null;
  let filtro = 0; // 0 = todos os lotes
  let situacao = 'todos'; // todos | faltam | pagos
  let mes = diaSP().slice(0, 7);
  let pagos = new Map();

  // ---- Totais (os 3 números do caixa)
  const visor = criarVisor(
    [
      { chave: 'salarios', rotulo: 'Salários a pagar' },
      { chave: 'premios', rotulo: 'Prêmios para abater do consumo' },
      { chave: 'total', rotulo: 'Total da folha com prêmios' },
    ],
    { largo: true },
  );
  const nota = el(
    'p',
    { class: 'nota-folha' },
    el('strong', {}, 'Como fica para o caixa: '),
    'o prêmio é creditado ao funcionário e abate o saldo de consumo que ele deve à empresa, então não precisa sair como pagamento em dinheiro. ',
    'Confirme o tratamento contábil e trabalhista do prêmio com o seu contador.',
  );
  const resumoLotes = el('div', {});

  // ---- Formulário
  const nome = campoTexto('Funcionário', { maxlength: 60 });
  const salario = campoTexto('Salário (R$)', { decimal: true });
  const premio = campoTexto('Prêmio (R$)', { decimal: true, placeholder: '0,00' });
  const lote = campoSelecao('Lote');
  preencherOpcoes(lote.input, LOTES.map((l) => ({ valor: String(l), texto: `Lote ${textoLote(l)}` })), { vazio: 'Escolha…' });
  const botao = el('button', { type: 'submit', class: 'primario' }, 'Adicionar');
  const cancelar = el('button', { type: 'button', hidden: true }, 'Cancelar');
  const importar = el('button', { type: 'button' }, 'Importar tabela');

  function sairEdicao() {
    editando = null;
    for (const c of [nome, salario, premio]) c.input.value = '';
    lote.input.value = '';
    botao.textContent = 'Adicionar';
    cancelar.hidden = true;
  }
  cancelar.addEventListener('click', sairEdicao);

  const form = el(
    'form',
    { class: 'linha-form', novalidate: true },
    nome.bloco,
    salario.bloco,
    premio.bloco,
    lote.bloco,
    el('div', { class: 'botoes' }, botao, cancelar, importar),
  );
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editando) sairEdicao();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    executar(aviso, botao, async () => {
      const f = await repo.salvarFolha({
        id: editando,
        nome: nome.input.value,
        salario: salario.input.value,
        premio: premio.input.value,
        lote: lote.input.value,
      });
      sairEdicao();
      await desenhar();
      aviso.ok(`"${f.nome}" salvo.`);
      nome.input.focus();
    });
  });

  // ---- Lista e resumo
  const area = el('div', {});
  const barraFiltro = el('div', { class: 'barra-filtro' });
  const resumoFiltro = el('p', { class: 'resumo-filtro', 'aria-live': 'polite' });

  function chips(rotulo, opcoes, atual, aoEscolher) {
    return el(
      'div',
      { class: 'filtro-lote', role: 'group', 'aria-label': rotulo },
      opcoes.map(([valor, texto]) =>
        el('button', { type: 'button', 'aria-pressed': String(atual === valor), onclick: () => aoEscolher(valor) }, texto),
      ),
    );
  }

  function desenharFiltro() {
    trocar(
      barraFiltro,
      el(
        'div',
        { class: 'seletor-mes' },
        el('button', { type: 'button', 'aria-label': 'Mês anterior', onclick: () => trocarMes(-1) }, '‹'),
        el('strong', { 'aria-live': 'polite' }, rotuloMes(mes).replace(/^./, (c) => c.toUpperCase())),
        el('button', { type: 'button', 'aria-label': 'Próximo mês', onclick: () => trocarMes(1) }, '›'),
      ),
      chips('Mostrar por lote', [[0, 'Todos'], ...LOTES.map((l) => [l, `Lote ${l}`])], filtro, (l) => {
        filtro = l;
        desenharLista();
      }),
      chips(
        'Mostrar por situação',
        [['todos', 'Tudo'], ['faltam', 'Falta pagar'], ['pagos', 'Já pagos']],
        situacao,
        (v) => {
          situacao = v;
          desenharLista();
        },
      ),
    );
  }

  async function trocarMes(n) {
    mes = somarMes(mes, n);
    await executar(aviso, null, desenhar);
  }

  const dataDoPagamento = (p) => {
    try {
      return formatarData(diaSP(p.pago_em.toDate())).slice(0, 5);
    } catch {
      return '';
    }
  };

  function celulaSituacao(f) {
    const p = pagos.get(f.id);
    if (!p) {
      const b = el('button', { type: 'button', class: 'primario' }, 'Marcar pago');
      b.addEventListener('click', () =>
        executar(aviso, b, async () => {
          await repo.marcarPago(mes, f);
          await desenhar();
          aviso.ok(`${f.nome}: pago em ${rotuloMes(mes)}.`);
        }),
      );
      return el('td', { class: 'situacao' }, el('span', { class: 'selo selo-falta' }, 'Falta pagar'), b);
    }
    const mudou = p.salario !== f.salario || p.premio !== f.premio;
    const desfazer = el('button', { type: 'button', class: 'perigo-leve' }, 'Desfazer');
    desfazer.addEventListener('click', async () => {
      if (!(await confirmar(`Desfazer o pagamento de "${f.nome}" em ${rotuloMes(mes)}?`, 'Desfazer'))) return;
      await executar(aviso, desfazer, async () => {
        await repo.desmarcarPago(mes, f.id);
        await desenhar();
        aviso.ok(`Pagamento de "${f.nome}" desfeito.`);
      });
    });
    const dia = dataDoPagamento(p);
    return el(
      'td',
      { class: 'situacao' },
      el('span', { class: 'selo selo-pago' }, dia ? `Pago em ${dia}` : 'Pago'),
      mudou ? el('small', { class: 'aviso' }, `Foi pago ${dinheiro(p.salario)}; a folha agora tem ${dinheiro(f.salario)}.`) : null,
      desfazer,
    );
  }

  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  function desenharLista() {
    desenharFiltro();
    const doLote = filtro ? lista.filter((f) => f.lote === filtro) : lista;
    const visiveis = doLote.filter((f) => situacao === 'todos' || (situacao === 'pagos') === pagos.has(f.id));
    const r = resumirPagamentos(doLote, pagos);
    const onde = filtro ? `Lote ${filtro} (${PRAZOS_LOTE[filtro].toLowerCase()})` : 'Todos os lotes';
    trocar(
      resumoFiltro,
      el('strong', {}, `${onde} · ${rotuloMes(mes)}`),
      el(
        'span',
        {},
        ` · ${plural(r.pagos.pessoas, 'pessoa paga', 'pessoas pagas')} de ${doLote.length}`,
      ),
      el('br'),
      el('span', {}, `Falta pagar: ${dinheiro(r.faltam.salarios)} em salários (${plural(r.faltam.pessoas, 'pessoa', 'pessoas')}) + ${dinheiro(r.faltam.premios)} de prêmios a abater`),
      el('br'),
      el('span', {}, `Já pago: ${dinheiro(r.pagos.salarios)} em salários + ${dinheiro(r.pagos.premios)} de prêmios`),
    );
    resumoFiltro.hidden = doLote.length === 0;
    trocar(
      area,
      visiveis.length
        ? tabela(
            ['Funcionário', 'Salário', 'Prêmio', 'Lote', 'Situação', 'Ações'],
            visiveis.map((f) =>
              el(
                'tr',
                {},
                el('td', {}, f.nome),
                el('td', { class: 'num' }, dinheiro(f.salario)),
                el('td', { class: 'num' }, dinheiro(f.premio)),
                el('td', {}, textoLote(f.lote)),
                celulaSituacao(f),
                el('td', { class: 'acoes' }, botaoEditar(f), botaoApagar(f)),
              ),
            ),
          )
        : el(
            'p',
            { class: 'aviso' },
            !lista.length
              ? 'Nenhum funcionário cadastrado. Adicione acima ou use "Importar tabela" para colar a folha de uma vez.'
              : situacao === 'faltam'
                ? 'Ninguém com pagamento em aberto aqui. Tudo pago!'
                : situacao === 'pagos'
                  ? 'Ninguém foi marcado como pago aqui ainda.'
                  : `Ninguém no lote ${filtro}.`,
          ),
    );
  }

  async function desenhar() {
    [lista, pagos] = await Promise.all([repo.folha(), repo.pagamentosDoMes(mes)]);
    const r = resumirFolha(lista);
    visor.definir(
      { salarios: dinheiro(r.totais.salarios), premios: dinheiro(r.totais.premios), total: dinheiro(r.totais.total) },
      `${r.totais.pessoas} ${r.totais.pessoas === 1 ? 'funcionário' : 'funcionários'}`,
    );

    const linhasLotes = r.lotes.map((l) =>
      el(
        'tr',
        {},
        el('td', {}, `Lote ${l.lote}`),
        el('td', {}, `${l.prazo} · ${l.pessoas} ${l.pessoas === 1 ? 'pessoa' : 'pessoas'}`),
        el('td', { class: 'num' }, dinheiro(l.salarios)),
        el('td', { class: 'num' }, dinheiro(l.premios)),
        el('td', { class: 'num' }, dinheiro(l.total)),
      ),
    );
    linhasLotes.push(
      el(
        'tr',
        { class: 'linha-total' },
        el('td', {}, 'Total'),
        el('td', {}, ''),
        el('td', { class: 'num' }, dinheiro(r.totais.salarios)),
        el('td', { class: 'num' }, dinheiro(r.totais.premios)),
        el('td', { class: 'num' }, dinheiro(r.totais.total)),
      ),
    );
    trocar(
      resumoLotes,
      el('h3', {}, 'Resumo por lote'),
      tabela(['Lote', 'Prazo', 'Salários', 'Prêmios', 'Total'], linhasLotes),
    );

    desenharLista();
  }

  function botaoEditar(f) {
    return el(
      'button',
      {
        type: 'button',
        onclick: () => {
          editando = f.id;
          nome.input.value = f.nome;
          salario.input.value = virgula(f.salario);
          premio.input.value = virgula(f.premio);
          lote.input.value = String(f.lote);
          botao.textContent = 'Salvar alteração';
          cancelar.hidden = false;
          form.scrollIntoView({ block: 'center' });
          nome.input.focus();
        },
      },
      'Editar',
    );
  }

  function botaoApagar(f) {
    const b = el('button', { type: 'button', class: 'perigo-leve' }, 'Apagar');
    b.addEventListener('click', async () => {
      if (!(await confirmar(`Apagar "${f.nome}" da folha?`))) return;
      await executar(aviso, b, async () => {
        await repo.apagarFolha(f.id);
        if (editando === f.id) sairEdicao();
        await desenhar();
        aviso.ok(`"${f.nome}" apagado da folha.`);
      });
    });
    return b;
  }

  // ---- Importar tabela colada
  importar.addEventListener('click', () =>
    janelaFormulario('Importar a folha', (formulario, fechar) => {
      const texto = el('textarea', { id: 'folha-colada', rows: 9, spellcheck: 'false', placeholder: 'Eliane\tR$ 3.500,00\tR$ 500,00\t2' });
      const previa = el('div', { class: 'previa-importacao', 'aria-live': 'polite' });
      const enviar = el('button', { type: 'submit', class: 'primario', disabled: true }, 'Importar');
      const erro = criarAviso();
      let validas = [];

      function conferir() {
        const r = lerLinhasFolha(texto.value);
        validas = r.validas;
        const soma = resumirFolha(validas.map((v) => ({ nome: v.nome, salario: v.salario.toFixed(2), premio: v.premio.toFixed(2), lote: v.lote })));
        trocar(
          previa,
          validas.length
            ? el(
                'p',
                {},
                el('strong', {}, `${validas.length} ${validas.length === 1 ? 'funcionário' : 'funcionários'}`),
                ` · salários ${dinheiro(soma.totais.salarios)} · prêmios ${dinheiro(soma.totais.premios)} · total ${dinheiro(soma.totais.total)}`,
              )
            : el('p', { class: 'aviso' }, 'Cole as linhas da tabela acima.'),
          r.erros.length
            ? el(
                'ul',
                { class: 'erros-importacao' },
                r.erros.slice(0, 8).map((e) => el('li', {}, e)),
                r.erros.length > 8 ? el('li', {}, `… e mais ${r.erros.length - 8} linhas com erro.`) : null,
              )
            : null,
        );
        enviar.disabled = validas.length === 0 || r.erros.length > 0;
        enviar.textContent = validas.length ? `Importar ${validas.length}` : 'Importar';
      }
      texto.addEventListener('input', conferir);

      formulario.append(
        el('p', { class: 'aviso' }, 'Cole a tabela com Funcionário, Salário, Prêmio e Lote, uma pessoa por linha (pode copiar de uma planilha). O cabeçalho e a linha TOTAL são ignorados. Quem já está cadastrado não é alterado.'),
        el('label', { for: 'folha-colada', class: 'visualmente-oculto' }, 'Tabela da folha'),
        texto,
        previa,
        erro.elemento,
        el('div', { class: 'botoes' }, el('button', { type: 'button', onclick: fechar }, 'Cancelar'), enviar),
      );
      formulario.addEventListener('submit', (e) => {
        e.preventDefault();
        executar(erro, enviar, async () => {
          const r = await repo.importarFolha(validas);
          fechar();
          await desenhar();
          aviso.ok(
            `${r.criados} ${r.criados === 1 ? 'funcionário importado' : 'funcionários importados'}.` +
              (r.ignorados.length
                ? ` Já cadastrados e mantidos como estavam: ${r.ignorados.slice(0, 5).join(', ')}${r.ignorados.length > 5 ? ` e mais ${r.ignorados.length - 5}` : ''}.`
                : ''),
          );
        });
      });
      conferir();
      queueMicrotask(() => texto.focus());
    }),
  );

  desenhar().catch((e) => aviso.erro(traduzirErro(e)));
  return el(
    'div',
    {},
    el('h2', {}, 'Salários'),
    aviso.elemento,
    visor.elemento,
    nota,
    el('section', { class: 'pilha' }, resumoLotes),
    el('section', { class: 'cartao bloco-folha' }, el('h3', {}, 'Folha de pagamento'), form, barraFiltro, resumoFiltro, area),
  );
}
