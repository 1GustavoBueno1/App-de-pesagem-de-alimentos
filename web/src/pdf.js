// Gera o PDF A4 dos relatórios no navegador (jsPDF + jspdf-autotable).
// Se não couber em uma página, a tabela continua na seguinte com o cabeçalho repetido.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const MARGEM = 15; // mm
const VERDE = [31, 111, 74];
const CINZA = [236, 235, 230];
const COLUNAS_NUMERICAS = new Set([2, 3, 4, 5, 6, 7]);

// Página A4 com título, hora de geração e o cursor vertical `y` das seções.
function novoDocumento(r) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margens = { left: MARGEM, right: MARGEM, top: MARGEM, bottom: MARGEM + 6 };
  const estilo = { fontSize: 9, cellPadding: 1.6, lineColor: [210, 208, 202], lineWidth: 0.1 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(r.titulo, MARGEM, MARGEM + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(r.geradoEm, largura - MARGEM, MARGEM + 4, { align: 'right' });

  const p = { doc, largura, altura, util: largura - 2 * MARGEM, y: MARGEM + 11 };

  // Garante espaço antes de uma seção; senão passa para a próxima página.
  p.espaco = (mm) => {
    if (p.y + mm > altura - margens.bottom) {
      doc.addPage();
      p.y = MARGEM + 4;
    }
  };

  p.tituloSecao = (texto) => {
    p.espaco(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(texto, MARGEM, p.y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    p.y += 3;
  };

  p.texto = (texto) => {
    for (const linha of doc.splitTextToSize(texto, p.util)) {
      p.espaco(5);
      p.y += 4;
      doc.text(linha, MARGEM, p.y);
    }
  };

  /** Tabela com cabeçalho verde (repetido a cada página) e rodapé cinza de totais. */
  p.tabela = ({ colunas, linhas, totais, numericas }) => {
    autoTable(doc, {
      startY: p.y,
      head: [colunas],
      body: linhas,
      foot: totais ? [totais] : undefined,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      margin: margens,
      styles: estilo,
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: CINZA, textColor: 20, fontStyle: 'bold' },
      didParseCell: (c) => {
        if (numericas.has(c.column.index)) c.cell.styles.halign = 'right';
      },
    });
    p.y = doc.lastAutoTable.finalY + 9;
  };

  /** Pares rótulo/valor sem bordas (bloco de resumo). */
  p.resumo = (pares) => {
    autoTable(doc, {
      startY: p.y,
      body: pares,
      theme: 'plain',
      margin: { ...margens, right: largura / 2 },
      styles: { fontSize: 10, cellPadding: 1.2 },
      columnStyles: { 0: { textColor: 80 }, 1: { fontStyle: 'bold', halign: 'right' } },
    });
    p.y = doc.lastAutoTable.finalY + 9;
  };

  p.finalizar = () => {
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, altura - 8, { align: 'right' });
    }
    return doc;
  };

  return p;
}

/** PDF do relatório de um dia (montarRelatorio). */
export function gerarPdf(r) {
  const p = novoDocumento(r);

  if (r.linhas.length === 0) {
    p.doc.text('Nenhuma saída registrada nesta data.', MARGEM, p.y + 4);
    p.y += 12;
  } else {
    p.tabela({ colunas: r.colunas, linhas: r.linhas, totais: r.totais, numericas: COLUNAS_NUMERICAS });
  }

  if (r.observacao) {
    p.tituloSecao('Observação do dia');
    p.texto(r.observacao);
    p.y += 8;
  }

  if (r.gastos) {
    p.tituloSecao('Gastos do dia');
    p.tabela({
      colunas: ['Descrição', 'Forma de pagamento', 'Valor (R$)'],
      linhas: r.gastos.linhas,
      totais: ['Total', '', r.gastos.total],
      numericas: new Set([2]),
    });
  }

  return p.finalizar();
}

/** PDF do relatório semanal ou mensal (montarRelatorioPeriodo). */
export function gerarPdfPeriodo(r) {
  const p = novoDocumento(r);
  const numericas = new Set([1, 2, 3, 4]);

  if (r.subtitulo) {
    p.doc.text(r.subtitulo, MARGEM, p.y);
    p.y += 9;
  }

  p.tituloSecao('Resumo');
  p.resumo(r.resumo);

  if (r.vazio) {
    p.doc.text('Nenhuma saída registrada neste período.', MARGEM, p.y);
    p.y += 10;
  } else {
    p.tituloSecao('Custo de produção por dia');
    p.tabela({ ...r.porDia, numericas });
    p.tituloSecao('Custo de produção por alimento');
    p.tabela({ ...r.porAlimento, numericas });
  }

  if (r.gastos) {
    p.tituloSecao('Gastos do período');
    p.tabela({
      colunas: ['Data', 'Descrição', 'Forma de pagamento', 'Valor (R$)'],
      linhas: r.gastos.linhas,
      totais: ['Total', '', '', r.gastos.total],
      numericas: new Set([3]),
    });
  }

  return p.finalizar();
}

/** Gera e baixa o arquivo (no navegador). */
export function baixarPdf(r) {
  gerarPdf(r).save(r.nomeArquivo);
}

export function baixarPdfPeriodo(r) {
  gerarPdfPeriodo(r).save(r.nomeArquivo);
}
