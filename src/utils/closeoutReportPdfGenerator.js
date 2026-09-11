import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatToUSD } from './currencyFormatter';
import { arkaLogoBase64 } from '../assets/logoBase64';

export function generateCloseoutReportPdf({
  projectData,
  expenses = [],
  changeOrders = [],
  payments = [],
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
  const rightX = pageWidth - margin;

  // Colors
  const darkNavy = [15, 23, 42]; // #0F172A
  const darkGray = [30, 41, 59]; // #1E293B
  const textMuted = [100, 116, 139]; // #64748B
  const goldColor = [180, 140, 60]; // #B48C3C
  const borderGray = [226, 232, 240]; // #E2E8F0
  const lightBg = [248, 250, 252]; // #F8FAFC
  const emeraldGreen = [16, 185, 129]; // #10B981
  const softAmber = [217, 119, 6]; // #D97706

  // Top Accent Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // 1. HEADER SECTION
  // Logo
  try {
    if (arkaLogoBase64) {
      doc.addImage(arkaLogoBase64, 'PNG', margin, 9, 22, 22);
    }
  } catch (err) {
    console.warn('Could not load logo into closeout report:', err);
  }

  // Company Info
  const companyStartY = 35;
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ARKA DESIGN GROUP', margin, companyStartY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.text('2312 SE 18th Cir', margin, companyStartY + 4.5);
  doc.text('Ocala, FL 34471', margin, companyStartY + 9);
  doc.text('info@arkadg.com | +1 (813) 610-9309', margin, companyStartY + 13.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text('https://www.arkadg.com', margin, companyStartY + 18);

  // Top Right: Title Block
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleText = isSpanish ? 'INFORME FINAL DE CIERRE' : 'PROJECT CLOSEOUT REPORT';
  doc.text(titleText, rightX, 18, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'ESTADO: FINALIZADO' : 'STATUS: COMPLETED', rightX, 24, { align: 'right' });

  const generatedDate = new Date().toISOString().split('T')[0];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`${isSpanish ? 'Fecha de Emisión:' : 'Date of Issue:'} ${generatedDate}`, rightX, 29, { align: 'right' });

  // 2. PROJECT & CLIENT METADATA
  const metaY = 60;
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, metaY - 3, rightX, metaY - 3);

  // Left column: Project info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'PROYECTO & UBICACIÓN' : 'PROJECT & SITE', margin, metaY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(projectData?.project_name || '-', margin, metaY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  const locationStr = projectData?.location ? `${projectData.location}` : '';
  const datesStr = `${isSpanish ? 'Inicio:' : 'Start:'} ${projectData?.start_date || projectData?.created_at?.split('T')[0] || '-'} | ${isSpanish ? 'Cierre:' : 'Closed:'} ${projectData?.target_date || generatedDate}`;
  doc.text(locationStr || datesStr, margin, metaY + 12.5);
  if (locationStr) {
    doc.text(datesStr, margin, metaY + 17);
  }

  // Right column: Client info
  const clientX = margin + 95;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(isSpanish ? 'CLIENTE / PROPIETARIO' : 'CLIENT / OWNER', clientX, metaY + 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(projectData?.client_name || '-', clientX, metaY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  if (projectData?.client_email) {
    doc.text(projectData.client_email, clientX, metaY + 12.5);
  }

  // 3. FINANCIAL CALCULATIONS
  const baseContract = parseFloat(projectData?.base_contract_value) || 0;
  const approvedCO = changeOrders
    .filter(co => (co.status || '').toLowerCase() === 'aprobado' || (co.status || '').toLowerCase() === 'approved')
    .reduce((sum, co) => sum + (parseFloat(co.extra_charge) || 0), 0);
  const finalContract = baseContract + approvedCO;

  const depositReceived = parseFloat(projectData?.deposit_received) || 0;
  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalCollected = depositReceived + totalPayments;
  const pendingBalance = finalContract - totalCollected;

  // Expenses breakdown
  let materialsCost = 0;
  let laborCost = 0;
  let subcontractsCost = 0;
  let otherCost = 0;

  expenses.forEach(item => {
    const cat = (item.category || '').toLowerCase();
    const amt = parseFloat(item.amount) || 0;
    if (cat.includes('material')) {
      materialsCost += amt;
    } else if (cat.includes('mano de obra') || cat.includes('labor')) {
      laborCost += amt;
    } else if (cat.includes('subcontrat')) {
      subcontractsCost += amt;
    } else {
      otherCost += amt;
    }
  });

  const totalDirectCosts = materialsCost + laborCost + subcontractsCost + otherCost;
  const grossProfit = finalContract - totalDirectCosts;
  const grossMarginPct = finalContract > 0 ? ((grossProfit / finalContract) * 100).toFixed(1) : '0.0';

  // 4. EXECUTIVE FINANCIAL KPI CARDS
  const cardsY = metaY + 24;
  const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
  const cardHeight = 18;

  const kpis = [
    {
      label: isSpanish ? 'VALOR CONTRATO' : 'CONTRACT VALUE',
      value: formatToUSD(finalContract),
      color: darkNavy
    },
    {
      label: isSpanish ? 'TOTAL RECAUDADO' : 'TOTAL COLLECTED',
      value: formatToUSD(totalCollected),
      color: emeraldGreen
    },
    {
      label: isSpanish ? 'COSTOS DIRECTOS' : 'DIRECT COSTS',
      value: formatToUSD(totalDirectCosts),
      color: softAmber
    },
    {
      label: isSpanish ? 'UTILIDAD BRUTA' : 'GROSS PROFIT',
      value: `${formatToUSD(grossProfit)} (${grossMarginPct}%)`,
      color: goldColor
    }
  ];

  kpis.forEach((kpi, idx) => {
    const cx = margin + (idx * (cardWidth + 3));
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, cardsY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(kpi.label, cx + 3.5, cardsY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, cx + 3.5, cardsY + 12.5);
  });

  // 5. DIRECT COSTS BREAKDOWN TABLE
  const tableStartY = cardsY + cardHeight + 8;

  const costBreakdownBody = [
    [isSpanish ? 'Materiales' : 'Materials', formatToUSD(materialsCost), totalDirectCosts > 0 ? `${((materialsCost / totalDirectCosts) * 100).toFixed(1)}%` : '0%'],
    [isSpanish ? 'Mano de Obra (Horas)' : 'Direct Labor / Hours', formatToUSD(laborCost), totalDirectCosts > 0 ? `${((laborCost / totalDirectCosts) * 100).toFixed(1)}%` : '0%'],
    [isSpanish ? 'Subcontratistas' : 'Subcontractors', formatToUSD(subcontractsCost), totalDirectCosts > 0 ? `${((subcontractsCost / totalDirectCosts) * 100).toFixed(1)}%` : '0%'],
    [isSpanish ? 'Otros Gastos' : 'Other Direct Expenses', formatToUSD(otherCost), totalDirectCosts > 0 ? `${((otherCost / totalDirectCosts) * 100).toFixed(1)}%` : '0%'],
    [isSpanish ? 'TOTAL COSTOS DIRECTOS' : 'TOTAL DIRECT COSTS', formatToUSD(totalDirectCosts), '100%']
  ];

  autoTable(doc, {
    startY: tableStartY,
    head: [[
      isSpanish ? 'DESGLOSE DE COSTOS DIRECTOS' : 'DIRECT COSTS BREAKDOWN',
      isSpanish ? 'MONTO TOTAL' : 'TOTAL AMOUNT',
      isSpanish ? '% DEL COSTO' : '% OF COST'
    ]],
    body: costBreakdownBody,
    theme: 'grid',
    headStyles: {
      fillColor: darkNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      lineColor: darkNavy
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold', textColor: darkNavy },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 25, halign: 'right', fontStyle: 'normal' }
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      textColor: darkGray,
      lineColor: borderGray,
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: lightBg
    },
    margin: { left: margin, right: margin }
  });

  // 6. FINANCIAL RECONCILIATION SUMMARY TABLE
  const reconStartY = doc.lastAutoTable.finalY + 6;

  const reconBody = [
    [isSpanish ? 'Contrato Base Inicial' : 'Initial Base Contract', formatToUSD(baseContract)],
    [isSpanish ? `Órdenes de Cambio Aprobadas (${changeOrders.filter(co => (co.status || '').toLowerCase() === 'aprobado' || (co.status || '').toLowerCase() === 'approved').length})` : `Approved Change Orders (${changeOrders.filter(co => (co.status || '').toLowerCase() === 'aprobado' || (co.status || '').toLowerCase() === 'approved').length})`, `+${formatToUSD(approvedCO)}`],
    [isSpanish ? 'Valor Final del Contrato' : 'Final Contract Value', formatToUSD(finalContract)],
    [isSpanish ? 'Total Cobrado y Recaudado (Anticipo + Abonos)' : 'Total Collected (Deposit + Payments)', formatToUSD(totalCollected)],
    [isSpanish ? 'Saldo Pendiente por Cobrar' : 'Outstanding Balance Due', formatToUSD(Math.max(0, pendingBalance))],
    [isSpanish ? 'Total Costos Directos Ejecutados' : 'Total Direct Costs Incurred', `-${formatToUSD(totalDirectCosts)}`],
    [isSpanish ? 'UTILIDAD BRUTA FINAL (Margen)' : 'FINAL GROSS PROFIT (Margin)', `${formatToUSD(grossProfit)} (${grossMarginPct}%)`]
  ];

  autoTable(doc, {
    startY: reconStartY,
    head: [[
      isSpanish ? 'RESUMEN FINANCIERO & BALANCE FINAL' : 'FINANCIAL SUMMARY & FINAL RECONCILIATION',
      isSpanish ? 'VALOR' : 'AMOUNT'
    ]],
    body: reconBody,
    theme: 'grid',
    headStyles: {
      fillColor: goldColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
      lineColor: goldColor
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold', textColor: darkNavy },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold', textColor: darkNavy }
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 3,
      textColor: darkGray,
      lineColor: borderGray,
      lineWidth: 0.2
    },
    alternateRowStyles: {
      fillColor: lightBg
    },
    margin: { left: margin, right: margin }
  });

  // 7. SIGN-OFF / ACCEPTANCE SECTION
  const signY = pageHeight - 38;
  const colWidth = (pageWidth - (margin * 2) - 20) / 2;

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.4);

  // Studio signature line
  doc.line(margin, signY, margin + colWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(isSpanish ? 'ARKA DESIGN GROUP — DIRECCIÓN DE PROYECTO' : 'ARKA DESIGN GROUP — PROJECT DIRECTOR', margin, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Firma autorizada y fecha' : 'Authorized signature & date', margin, signY + 7.5);

  // Client signature line
  const clientSignX = margin + colWidth + 20;
  doc.line(clientSignX, signY, clientSignX + colWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(isSpanish ? `CONFORMIDAD DEL CLIENTE (${projectData?.client_name || 'CLIENTE'})` : `CLIENT ACCEPTANCE (${projectData?.client_name || 'CLIENT'})`, clientSignX, signY + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(isSpanish ? 'Firma de recibido a satisfacción y fecha' : 'Customer acceptance signature & date', clientSignX, signY + 7.5);

  // 8. FOOTER
  const footerY = pageHeight - 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(
    isSpanish 
      ? 'Documento de Cierre Oficial generado por Arka Design Group Operating System.' 
      : 'Official Project Closeout Report generated by Arka Design Group Operating System.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Bottom Gold Bar
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, pageHeight - 2.5, pageWidth, 2.5, 'F');

  // Save / Download PDF
  const filename = `Closeout_Report_${(projectData?.project_name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')}_${generatedDate}.pdf`;
  doc.save(filename);
}
