import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToUSD } from './currencyFormatter';

export function generateInvoicePdf({
  invoiceNumber = 'INV-001',
  invoiceDate = new Date().toISOString().split('T')[0],
  dueDate = '',
  clientName = '',
  projectName = '',
  description = 'Billing / Progress Payment',
  amount = 0,
  notes = '',
  language = 'es'
}) {
  const isSpanish = language === 'es';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Primary Colors (Arka Luxury Palette)
  const navyColor = [13, 23, 38]; // #0D1726
  const goldColor = [180, 140, 60]; // #B48C3C
  const darkGray = [51, 65, 85]; // #334155
  const lightGray = [100, 116, 139]; // #64748B
  const softBg = [251, 249, 245]; // #FBF9F5

  // 1. Top Decorative Golden Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Company Brand & Title Header
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ARKA DESIGN GROUP', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'ESTUDIO DE ARQUITECTURA & DISEÑO DE INTERIORES' : 'ARCHITECTURE & INTERIOR DESIGN STUDIO', margin, 25);

  // Invoice Title on the right
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  const invoiceTitle = isSpanish ? 'FACTURA' : 'INVOICE';
  doc.text(invoiceTitle, pageWidth - margin, 20, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(`#${invoiceNumber}`, pageWidth - margin, 26, { align: 'right' });

  // Golden Divider Line
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.75);
  doc.line(margin, 30, pageWidth - margin, 30);

  // 3. Information Columns (Billed To & Invoice Details)
  const infoY = 38;

  // Left: Bill To (Cliente & Proyecto)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(isSpanish ? 'FACTURADO A:' : 'BILLED TO:', margin, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(clientName || (isSpanish ? 'Cliente General' : 'General Client'), margin, infoY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${isSpanish ? 'Proyecto:' : 'Project:'} ${projectName || '-'}`, margin, infoY + 12);

  // Right: Dates & Invoice Metadata
  const rightColX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(isSpanish ? 'DETALLES DE FACTURACIÓN:' : 'INVOICE DETAILS:', rightColX, infoY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(`${isSpanish ? 'Fecha de Emisión:' : 'Issue Date:'} ${invoiceDate}`, rightColX, infoY + 6, { align: 'right' });
  if (dueDate) {
    doc.text(`${isSpanish ? 'Fecha de Vencimiento:' : 'Due Date:'} ${dueDate}`, rightColX, infoY + 11, { align: 'right' });
  }

  // 4. Line Items Table
  const parsedAmount = parseFloat(amount) || 0;
  const tableData = [
    [
      '1',
      description || (isSpanish ? 'Abono / Pago de Proyecto' : 'Project Payment / Installment'),
      formatToUSD(parsedAmount)
    ]
  ];

  autoTable(doc, {
    startY: 62,
    head: [[
      isSpanish ? '#' : '#',
      isSpanish ? 'DESCRIPCIÓN DEL CONCEPTO' : 'BILLING DESCRIPTION',
      isSpanish ? 'MONTO' : 'AMOUNT'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'normal' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 5,
      textColor: darkGray,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: softBg
    },
    margin: { left: margin, right: margin }
  });

  const finalTableY = doc.lastAutoTable.finalY + 10;

  // 5. Total Summary Card (Bottom Right)
  const summaryBoxWidth = 70;
  const summaryBoxX = pageWidth - margin - summaryBoxWidth;
  
  doc.setFillColor(softBg[0], softBg[1], softBg[2]);
  doc.roundedRect(summaryBoxX, finalTableY, summaryBoxWidth, 24, 2, 2, 'F');
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(summaryBoxX, finalTableY, summaryBoxWidth, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(isSpanish ? 'TOTAL A PAGAR' : 'TOTAL AMOUNT DUE', summaryBoxX + 6, finalTableY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(formatToUSD(parsedAmount), summaryBoxX + 6, finalTableY + 18);

  // 6. Notes / Payment Instructions
  if (notes && notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text(isSpanish ? 'NOTAS / INSTRUCCIONES:' : 'NOTES / INSTRUCTIONS:', margin, finalTableY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitNotes = doc.splitTextToSize(notes, summaryBoxX - margin - 8);
    doc.text(splitNotes, margin, finalTableY + 12);
  }

  // 7. Footer
  const footerY = pageHeight - 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text(
    isSpanish 
      ? 'Gracias por su preferencia. Documento generado por Arka Design Group OS.' 
      : 'Thank you for your business. Document generated by Arka Design Group OS.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Bottom Golden Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');

  // Save / Download PDF
  const filename = `Invoice_${invoiceNumber}_${(clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
