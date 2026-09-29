import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToUSD } from './currencyFormatter';
import { arkaLogoBase64 } from '../assets/logoBase64';

function hexToRgb(hex, fallback = [180, 140, 60]) {
  if (!hex || typeof hex !== 'string') return fallback;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  if (c.length === 6) {
    const num = parseInt(c, 16);
    if (!isNaN(num)) {
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
  }
  return fallback;
}

export function generateInvoicePdf({
  invoiceNumber = 'INV-1083',
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
  language = 'es',
  organization = null
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
  const rightX = pageWidth - margin;

  // Dynamic Colors derived from organization
  const primaryHex = organization?.primary_color || '#C9A45C';
  const secondaryHex = organization?.secondary_color || '#0D1726';

  const goldColor = hexToRgb(primaryHex, [180, 140, 60]);
  const darkNavy = hexToRgb(secondaryHex, [15, 23, 42]);
  const darkGray = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const borderGray = [226, 232, 240]; // #E2E8F0
  const lightBg = [248, 250, 252]; // #F8FAFC
  const headerBg = darkNavy;
  const emeraldGreen = [16, 185, 129]; // #10B981

  // Dynamic Company Details
  const companyName = (organization?.name || 'Arka Design Group').toUpperCase();
  const companyAddress = organization?.address || '2312 SE 18th Cir, Ocala, FL 34471';
  const companyEmail = organization?.email || 'info@arkadg.com';
  const companyPhone = organization?.phone || '+1 (813) 610-9309';
  const companyWebsite = organization?.website || 'https://www.arkadg.com';
  const invoiceTerms = organization?.invoice_terms || 'Quote is based on design and floorplans sent by customer. Plumbing and electrical are not included. Our company does not do any structural work.';

  // Top Decorative Gold Accent Line
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 0, pageWidth, 3, 'F');

  // 1. HEADER SECTION
  // A. Logo (Tenant logo or styled fallback)
  let logoLoaded = false;
  try {
    const logoToUse = organization?.logo_url || arkaLogoBase64;
    if (logoToUse) {
      doc.addImage(logoToUse, 'PNG', margin, 9, 22, 22);
      logoLoaded = true;
    }
  } catch (err) {
    console.warn('Could not load logo into PDF:', err);
  }

  if (!logoLoaded && !arkaLogoBase64) {
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.roundedRect(margin, 9, 22, 22, 2.5, 2.5, 'F');
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, 9, 22, 22, 2.5, 2.5, 'S');

    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const initials = companyName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('');
    doc.text(initials || 'OS', margin + 11, 23, { align: 'center' });
  }

  // B. Company Info (Dynamic Header)
  const companyStartY = 35;
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(companyName, margin, companyStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);

  let currentCompY = companyStartY + 4.5;
  if (companyAddress) {
    const addressLines = companyAddress.includes('\n') 
      ? companyAddress.split('\n') 
      : doc.splitTextToSize(companyAddress, 70);
    addressLines.forEach(line => {
      doc.text(line.trim(), margin, currentCompY);
      currentCompY += 4.5;
    });
  }
  if (companyEmail) {
    doc.text(companyEmail, margin, currentCompY);
    currentCompY += 4.5;
  }
  if (companyPhone) {
    doc.text(companyPhone, margin, currentCompY);
    currentCompY += 4.5;
  }
  if (companyWebsite) {
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.text(companyWebsite, margin, currentCompY);
    currentCompY += 4.5;
  }

  // C. Top Right: Large "INVOICE" Title
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('INVOICE', rightX, 19, { align: 'right' });

  // 2. INVOICE METADATA & BILL TO
  const metaBoxY = 66;

  // Divider Line
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, metaBoxY - 4, rightX, metaBoxY - 4);

  // Left: "Bill to"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Bill to', margin, metaBoxY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(clientName || (isSpanish ? 'Cliente General' : 'Client'), margin, metaBoxY + 5.5);

  if (projectName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(`Project: ${projectName}`, margin, metaBoxY + 10.5);
  }

  // Right: "Invoice details" block
  const rightBoxX = rightX - 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Invoice details', rightBoxX, metaBoxY);

  doc.setFontSize(8.5);

  // Invoice no.
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('Invoice no. :', rightBoxX, metaBoxY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(invoiceNumber, rightX, metaBoxY + 5.5, { align: 'right' });

  // Invoice date
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('Invoice date :', rightBoxX, metaBoxY + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text(invoiceDate, rightX, metaBoxY + 10.5, { align: 'right' });

  // Due date
  if (dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Due date :', rightBoxX, metaBoxY + 15.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text(dueDate, rightX, metaBoxY + 15.5, { align: 'right' });
  }

  // 3. TABLE STRUCTURE: Exactly 5 columns
  // Column Headers: Product or service | Description | Qty | Rate | Amount
  const items = lineItems && lineItems.length > 0 
    ? lineItems 
    : [{ item: 'Services', description: 'Kitchen cabinets installation', qty: 1, rate: total, amount: total }];

  const tableBody = items.map((item, index) => {
    const q = parseFloat(item.qty) || 1;
    const r = parseFloat(item.rate) || 0;
    const a = parseFloat(item.amount) || (q * r);
    return [
      item.item || `Service #${index + 1}`,
      item.description || '-',
      q.toString(),
      formatToUSD(r),
      formatToUSD(a)
    ];
  });

  const tableStartY = dueDate ? metaBoxY + 22 : metaBoxY + 18;

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      'Product or service',
      'Description',
      'Qty',
      'Rate',
      'Amount'
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: headerBg,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.5,
      lineColor: headerBg
    },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: darkNavy },
      1: { cellWidth: 'auto', textColor: darkGray },
      2: { cellWidth: 16, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 28, halign: 'right', fontStyle: 'normal' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: darkNavy }
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
      fillColor: lightBg
    },
    margin: { left: margin, right: margin }
  });

  const finalTableY = doc.lastAutoTable.finalY + 5;

  // 4. TOTALS SECTION (Right-aligned at bottom of table)
  const totalsWidth = 72;
  const totalsX = pageWidth - margin - totalsWidth;
  let currentY = finalTableY;

  // Subtotal Row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Subtotal:', totalsX, currentY + 4);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatToUSD(subtotal || total), rightX, currentY + 4, { align: 'right' });
  currentY += 6.5;

  // Total Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Total:', totalsX, currentY + 4);
  doc.text(formatToUSD(total), rightX, currentY + 4, { align: 'right' });
  currentY += 6.5;

  // Payments Applied Row (if any)
  if (paymentsApplied > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text(isSpanish ? 'Abonos aplicados:' : 'Payments applied:', totalsX, currentY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatToUSD(paymentsApplied)}`, rightX, currentY + 4, { align: 'right' });
    currentY += 6.5;
  }

  // Balance Due (if different or deducted)
  if (paymentsApplied > 0) {
    currentY += 1.5;
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.roundedRect(totalsX - 3, currentY, totalsWidth + 3, 11, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.text(isSpanish ? 'SALDO A PAGAR:' : 'BALANCE DUE:', totalsX, currentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(formatToUSD(balanceDue !== undefined ? balanceDue : total), rightX - 2, currentY + 8.5, { align: 'right' });
    currentY += 13;
  }

  // 5. HARDCODED TERMS & PAYMENT INSTRUCTIONS (Exact text from Invoice 1083)
  let termsY = finalTableY + 4;
  const termsWidth = totalsX - margin - 10;

  // Additional custom user notes if present
  if (notes && notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text('Note to customer:', margin, termsY);
    termsY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitCustomNotes = doc.splitTextToSize(notes, termsWidth);
    doc.text(splitCustomNotes, margin, termsY);
    termsY += (splitCustomNotes.length * 3.8) + 4;
  }

  // Payment Info (Zelle)
  if (companyEmail) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    const zelleLabel = isSpanish ? 'Información de Pago (Zelle):' : 'Payment Info (Zelle):';
    doc.text(zelleLabel, margin, termsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    const labelWidth = doc.getTextWidth(zelleLabel);
    doc.text(` ${companyEmail}`, margin + labelWidth + 1, termsY);
    termsY += 5;
  }

  // Contract Terms & Conditions
  if (invoiceTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(isSpanish ? 'Términos del Contrato:' : 'Contract Terms:', margin, termsY);
    termsY += 3.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    const splitContract = doc.splitTextToSize(invoiceTerms, termsWidth);
    doc.text(splitContract, margin, termsY);
    termsY += (splitContract.length * 3.5) + 3;
  }

  // Payment note
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Tarifa del 3.5% para pagos con tarjeta de crédito' : '3.5% Credit Card payments Fee', margin, termsY);

  // 6. BOTTOM "WAYS TO PAY" FOOTER (Exact specification from Invoice 1083)
  const waysToPayY = pageHeight - 16;

  // Divider
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, waysToPayY - 3, rightX, waysToPayY - 3);

  // "Ways to pay" Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('Ways to pay', margin, waysToPayY + 2);

  // Payment methods: VISA, DISCOVER, AMEX, BANK, PayPal, venmo, affirm
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('VISA  |  DISCOVER  |  AMEX  |  BANK  |  PayPal  |  venmo  |  affirm', margin + 24, waysToPayY + 2);

  // Bottom Gold Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');

  // 7. Save / Download PDF
  const filename = `Invoice_${invoiceNumber}_${(clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(filename);
}
