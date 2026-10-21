// Gera o PDF A4 do relatório no navegador (jsPDF + jspdf-autotable).
// Se não couber em uma página, a tabela continua na seguinte com o cabeçalho repetido.
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const MARGEM = 15; // mm
const VERDE = [31, 111, 74];
const CINZA = [236, 235, 230];
const COLUNAS_NUMERICAS = new Set([2, 3, 4, 5, 6, 7]);

export function gerarPdf(r) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const util = largura - 2 * MARGEM;
  const margens = { left: MARGEM, right: MARGEM, top: MARGEM, bottom: MARGEM + 6 };
  const estilo = { fontSize: 9, cellPadding: 1.6, lineColor: [210, 208, 202], lineWidth: 0.1 };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(r.titulo, MARGEM, MARGEM + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(r.geradoEm, largura - MARGEM, MARGEM + 4, { align: 'right' });
  let y = MARGEM + 11;

  // Garante espaço antes de uma seção; senão passa para a próxima página.
  function espaco(mm) {
    if (y + mm > altura - margens.bottom) {
      doc.addPage();
      y = MARGEM + 4;
    }
  }

  function tituloSecao(texto) {
    espaco(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(texto, MARGEM, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    y += 3;
  }

  if (r.linhas.length === 0) {
    doc.text('Nenhuma saída registrada nesta data.', MARGEM, y + 4);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y,
      head: [r.colunas],
      body: r.linhas,
      foot: [r.totais],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      margin: margens,
      styles: estilo,
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: CINZA, textColor: 20, fontStyle: 'bold' },
      didParseCell: (c) => {
        if (COLUNAS_NUMERICAS.has(c.column.index)) c.cell.styles.halign = 'right';
      },
    });
    y = doc.lastAutoTable.finalY + 9;
  }

  if (r.observacao) {
    tituloSecao('Observação do dia');
    for (const linha of doc.splitTextToSize(r.observacao, util)) {
      espaco(5);
      y += 4;
      doc.text(linha, MARGEM, y);
    }
    y += 8;
  }

  if (r.gastos) {
    tituloSecao('Gastos do dia');
    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Forma de pagamento', 'Valor (R$)']],
      body: r.gastos.linhas,
      foot: [['Total', '', r.gastos.total]],
      showHead: 'everyPage',
      showFoot: 'lastPage',
      margin: margens,
      styles: estilo,
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: CINZA, textColor: 20, fontStyle: 'bold' },
      didParseCell: (c) => {
        if (c.column.index === 2) c.cell.styles.halign = 'right';
      },
    });
  }

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(`Página ${i} de ${paginas}`, largura - MARGEM, altura - 8, { align: 'right' });
  }
  return doc;
}

/** Gera e baixa o arquivo (no navegador). */
export function baixarPdf(r) {
  gerarPdf(r).save(r.nomeArquivo);
}
