import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToUSD } from './currencyFormatter';

export function generateInvoicePdf({
  invoiceNumber = 'INV-001',
  invoiceDate = new Date().toISOString().split('T')[0],
  dueDate = '',
  clientName = '',
  projectName = '',
  lineItems = [],
  subtotal = 0,
  total = 0,
  paymentsApplied = 0,
  balanceDue = 0,
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
  const margin = 14;

  // Color Palette (QuickBooks + Arka Luxury)
  const navyColor = [13, 23, 38]; // #0D1726
  const goldColor = [180, 140, 60]; // #B48C3C
  const darkGray = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const softBg = [251, 249, 245]; // #FBF9F5
  const borderGray = [226, 232, 240]; // #E2E8F0
  const emeraldGreen = [27, 122, 74]; // #1B7A4A

  // 1. Top Decorative Golden Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. HEADER SECTION (Left: Company Info | Right: INVOICE Title & Metadata)
  // Company Title
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ARKA DESIGN GROUP', margin, 18);

  // Company Address / Contact Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Estudio de Arquitectura & Diseño de Interiores' : 'Architecture & Interior Design Studio', margin, 23);
  doc.text('123 Design District Blvd, Suite 400', margin, 27.5);
  doc.text('Miami, FL 33137', margin, 32);
  doc.text('info@arkadesigngroup.com | (305) 555-0199', margin, 36.5);

  // Right Side: INVOICE Title & Box
  const rightX = pageWidth - margin;
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  const titleText = isSpanish ? 'FACTURA' : 'INVOICE';
  doc.text(titleText, rightX, 18, { align: 'right' });

  // Invoice Details Table (Right aligned)
  const metaStartY = 24;
  const metaLabelX = rightX - 38;

  doc.setFontSize(8.5);
  
  // Invoice #
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'FACTURA #:' : 'INVOICE #:', metaLabelX, metaStartY, { align: 'right' });
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(invoiceNumber, rightX, metaStartY, { align: 'right' });

  // Date
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'FECHA:' : 'DATE:', metaLabelX, metaStartY + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(invoiceDate, rightX, metaStartY + 5, { align: 'right' });

  // Due Date
  if (dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(isSpanish ? 'VENCIMIENTO:' : 'DUE DATE:', metaLabelX, metaStartY + 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(dueDate, rightX, metaStartY + 10, { align: 'right' });
  }

  // Divider Line
  doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.setLineWidth(0.6);
  doc.line(margin, 43, rightX, 43);

  // 3. BILL TO & PROJECT SECTION
  const billToY = 50;

  // Bill To Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'FACTURAR A / CLIENTE:' : 'BILL TO:', margin, billToY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(clientName || (isSpanish ? 'Cliente General' : 'General Client'), margin, billToY + 5.5);

  // Project Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  const projX = margin + 85;
  doc.text(isSpanish ? 'PROYECTO / UBICACIÓN:' : 'PROJECT / SITE:', projX, billToY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(projectName || '-', projX, billToY + 5.5);

  // 4. LINE ITEMS TABLE (QuickBooks Style Grid)
  const items = lineItems && lineItems.length > 0 
    ? lineItems 
    : [{ item: 'General Services', description: 'Remodeling & Construction', qty: 1, rate: total, amount: total }];

  const tableBody = items.map((item, index) => {
    const q = parseFloat(item.qty) || 1;
    const r = parseFloat(item.rate) || 0;
    const a = parseFloat(item.amount) || (q * r);
    return [
      item.item || `${index + 1}`,
      item.description || '-',
      q.toString(),
      formatToUSD(r),
      formatToUSD(a)
    ];
  });

  autoTable(doc, {
    startY: 65,
    head: [[
      isSpanish ? 'ITEM / SERVICIO' : 'ITEM / SERVICE',
      isSpanish ? 'DESCRIPCIÓN' : 'DESCRIPTION',
      isSpanish ? 'CANT' : 'QTY',
      isSpanish ? 'TASA / PRECIO' : 'RATE',
      isSpanish ? 'MONTO' : 'AMOUNT'
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: navyColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: navyColor
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: navyColor },
      1: { cellWidth: 'auto', textColor: darkGray },
      2: { cellWidth: 16, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: navyColor }
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 4,
      textColor: darkGray,
      lineColor: borderGray,
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: softBg
    },
    margin: { left: margin, right: margin }
  });

  const finalTableY = doc.lastAutoTable.finalY + 6;

  // 5. TOTALS SECTION (Bottom Right)
  const totalsWidth = 72;
  const totalsX = pageWidth - margin - totalsWidth;
  let currentY = finalTableY;

  // Subtotal Row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Subtotal:' : 'Subtotal:', totalsX, currentY + 4);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatToUSD(subtotal || total), rightX, currentY + 4, { align: 'right' });
  currentY += 7;

  // Total Row
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Total Factura:' : 'Total Invoice:', totalsX, currentY + 4);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatToUSD(total), rightX, currentY + 4, { align: 'right' });
  currentY += 7;

  // Payments Applied Row (if any)
  if (paymentsApplied > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text(isSpanish ? 'Pagos / Abonos Aplicados:' : 'Payments Applied:', totalsX, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatToUSD(paymentsApplied)}`, rightX, currentY + 4, { align: 'right' });
    currentY += 7;
  }

  // Balance Due Card (Highlighted Box)
  currentY += 2;
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.roundedRect(totalsX - 4, currentY, totalsWidth + 4, 14, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'SALDO A PAGAR:' : 'BALANCE DUE:', totalsX, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text(formatToUSD(balanceDue !== undefined ? balanceDue : total), rightX - 2, currentY + 10, { align: 'right' });

  // 6. TERMS & NOTES SECTION (Bottom Left)
  if (notes && notes.trim()) {
    const notesWidth = totalsX - margin - 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.text(isSpanish ? 'TÉRMINOS E INSTRUCCIONES DE PAGO:' : 'TERMS & PAYMENT INSTRUCTIONS:', margin, finalTableY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitNotes = doc.splitTextToSize(notes, notesWidth);
    doc.text(splitNotes, margin, finalTableY + 9);
  }

  // 7. FOOTER
  const footerY = pageHeight - 14;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3, rightX, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    isSpanish 
      ? 'Gracias por su preferencia. Documento profesional generado por Arka Design Group OS.' 
      : 'Thank you for your business. Professional invoice generated by Arka Design Group OS.',
    pageWidth / 2,
    footerY + 2,
    { align: 'center' }
  );

  // Bottom Golden Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');

  // Save / Download PDF
  const filename = `Invoice_${invoiceNumber}_${(clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
