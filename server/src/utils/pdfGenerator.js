import PDFDocument from 'pdfkit';

const DOC_TITLES = {
  COMMERCIAL_INVOICE: 'COMMERCIAL INVOICE',
  PACKING_LIST: 'PACKING LIST',
  BILL_OF_LADING: 'BILL OF LADING',
  CERTIFICATE_OF_ORIGIN: 'CERTIFICATE OF ORIGIN — SRI LANKA',
  PHYTOSANITARY: 'PHYTOSANITARY CERTIFICATE',
  BUNDLE: 'COMPLETE TRADE DOCUMENTATION BUNDLE',
};

function drawHeader(doc, title, subtitle) {
  doc
    .rect(40, 40, 515, 70)
    .fill('#18181B');

  doc
    .fillColor('#F59E0B')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('CEYLON SPICES BIMS — INTERNATIONAL TRADE DIVISION', 56, 54);

  doc
    .fillColor('#FFFFFF')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(title, 56, 70);

  doc
    .fillColor('#A1A1AA')
    .fontSize(9)
    .font('Helvetica')
    .text(subtitle, 56, 91);

  doc.fillColor('#18181B');
  doc.moveDown(3);
}

function renderSingleTradePage(doc, txn, docType) {
  const title = DOC_TITLES[docType] || 'OFFICIAL TRADE DOCUMENT';
  drawHeader(
    doc,
    title,
    `Document Ref: ${docType.slice(0, 3)}-${txn.txnNumber} | Generated: ${new Date().toISOString().slice(0, 10)}`
  );

  const startY = 130;
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#18181B')
    .text('Declaration & Shipment Details', 40, startY);

  doc
    .moveTo(40, startY + 15)
    .lineTo(555, startY + 15)
    .strokeColor('#E4E4E7')
    .stroke();

  const detailsLeft = [
    ['Declaration No:', txn.txnNumber],
    ['Trade Type:', txn.type],
    ['Shipment Status:', txn.status],
    ['HS Tariff Code:', txn.hsCode || '0906.11'],
    ['Incoterms:', txn.incoterms || 'FOB Colombo'],
  ];

  const detailsRight = [
    ['Origin:', txn.originCountry || 'Sri Lanka'],
    ['Destination:', txn.destinationCountry || 'USA'],
    ['Carrier / Vessel:', txn.carrier || 'Maersk Line'],
    ['Tracking / B/L No:', txn.trackingNumber || 'MAEU9081726'],
    ['Applicable Duty Rate:', `${Number(txn.dutyRate || 0).toFixed(1)}%`],
  ];

  let y = startY + 26;
  detailsLeft.forEach(([label, val], idx) => {
    const right = detailsRight[idx];
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#52525B').text(label, 40, y);
    doc.font('Helvetica').fontSize(9).fillColor('#18181B').text(String(val), 140, y);

    if (right) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#52525B').text(right[0], 310, y);
      doc.font('Helvetica').fontSize(9).fillColor('#18181B').text(String(right[1]), 420, y);
    }
    y += 18;
  });

  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#18181B').text('Counterparty Information', 40, y);
  y += 16;
  doc
    .rect(40, y, 515, 44)
    .fillAndStroke('#F4F4F5', '#E4E4E7');

  const partnerName =
    txn.partnerName || txn.customer?.name || txn.supplier?.name || 'European Spice Traders GmbH';
  doc
    .fillColor('#18181B')
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text(`Consignee / Partner: ${partnerName}`, 52, y + 10);
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor('#52525B')
    .text(
      `Exporter: Ceylon Spices BIMS Exports Pvt Ltd, Colombo 03, Sri Lanka | Authorized Officer: M. L. Umaima`,
      52,
      y + 25
    );

  y += 62;
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#18181B').text('Commodity Line Items', 40, y);
  y += 16;

  doc.rect(40, y, 515, 22).fill('#7C3AED');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
  doc.text('SKU / HS Code', 50, y + 7);
  doc.text('Commodity Description', 150, y + 7);
  doc.text('Qty (kg)', 350, y + 7);
  doc.text('Unit Price', 415, y + 7);
  doc.text('Line Total (USD)', 475, y + 7);

  y += 22;
  const items =
    txn.items?.length > 0
      ? txn.items
      : [
          {
            sku: 'SKU-CIN-01',
            name: txn.title || 'Ceylon Alba Cinnamon (Export Grade)',
            quantity: 500,
            unitPrice: Number(txn.totalValue || 19250) / 500,
            lineTotal: Number(txn.totalValue || 19250),
          },
        ];

  items.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
    doc.rect(40, y, 515, 22).fillAndStroke(rowBg, '#E4E4E7');
    doc.fillColor('#18181B').font('Helvetica').fontSize(8.5);
    doc.text(item.sku || txn.hsCode || '0906.11', 50, y + 7);
    doc.text(item.name || 'Ceylon Spice Lot', 150, y + 7);
    doc.text(String(item.quantity || 500), 350, y + 7);
    doc.text(`$${Number(item.unitPrice || 38.5).toFixed(2)}`, 415, y + 7);
    doc.font('Helvetica-Bold').text(`$${Number(item.lineTotal || txn.totalValue || 19250).toLocaleString()}`, 475, y + 7);
    y += 22;
  });

  y += 16;
  const dutyAmount = Number(txn.dutyAmount || 0);
  const grandTotal = Number(txn.totalValue || 19250) + dutyAmount;

  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#18181B');
  doc.text(`Subtotal Value: $${Number(txn.totalValue || 19250).toLocaleString()}`, 370, y);
  y += 15;
  doc.text(`Customs Duty (${Number(txn.dutyRate || 0)}%): $${dutyAmount.toLocaleString()}`, 370, y);
  y += 16;
  doc.fontSize(11).fillColor('#7C3AED').text(`Total Declared Value: $${grandTotal.toLocaleString()} USD`, 340, y);

  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#71717A')
    .text(
      'Certified true and correct. Electronically generated and verified by Ceylon Spices BIMS Trade Compliance Engine.',
      40,
      730
    );
}

export function streamTradeDocumentPdf(
  res,
  txn,
  docType = 'COMMERCIAL_INVOICE',
  { inline = false } = {}
) {
  const safeTxn = txn || { txnNumber: 'EXP-2026-0001', type: 'EXPORT', status: 'IN_TRANSIT' };
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const filename = `${docType.toLowerCase()}-${safeTxn.txnNumber || 'trade'}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${filename}"`
  );
  doc.pipe(res);

  if (docType === 'BUNDLE') {
    const types = [
      'COMMERCIAL_INVOICE',
      'PACKING_LIST',
      'BILL_OF_LADING',
      'CERTIFICATE_OF_ORIGIN',
    ];
    types.forEach((t, idx) => {
      if (idx > 0) doc.addPage();
      renderSingleTradePage(doc, safeTxn, t);
    });
  } else {
    renderSingleTradePage(doc, safeTxn, docType);
  }

  doc.end();
}

export function streamAnalyticsReportPdf(res, summary) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="ceylon-spices-bims-executive-report.pdf"`
  );
  doc.pipe(res);

  drawHeader(
    doc,
    'EXECUTIVE ANALYTICS & TRADE PERFORMANCE REPORT',
    `Generated: ${new Date().toISOString().slice(0, 10)} | Scope: Full Inventory, Suppliers, Customers & Export Volumes`
  );

  let y = 135;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#18181B').text('1. Executive Financial KPIs', 40, y);
  y += 20;

  const canViewFinance = summary.canViewFinance !== false;
  const kpis = [
    ...(canViewFinance
      ? [
          ['Total Revenue', `$${(summary.kpis.revenue / 1000).toFixed(0)}K`],
          ['Total Expenses', `$${(summary.kpis.expenses / 1000).toFixed(0)}K`],
          ['Net Profit Margin', `$${((summary.kpis.revenue - summary.kpis.expenses) / 1000).toFixed(0)}K`],
        ]
      : [
          ['Executive Financials', 'Restricted (Manager / Admin Access Required)'],
        ]),
    ['FIFO Inventory Valuation', `$${(summary.kpis.fifoValuation / 1000).toFixed(0)}K`],
    ['Inventory Turnover Ratio', `${summary.kpis.turnoverRatio}%`],
    ['Active Shipments', String(summary.kpis.activeShipments)],
  ];

  kpis.forEach(([label, value]) => {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#52525B').text(label, 50, y);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#7C3AED').text(value, 240, y);
    y += 18;
  });

  y += 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#18181B').text('2. Export Volume by Destination Country', 40, y);
  y += 20;

  summary.exportByCountry.forEach((row) => {
    doc.font('Helvetica').fontSize(9.5).fillColor('#18181B').text(`${row.country}`, 50, y);
    doc.font('Helvetica-Bold').text(`${row.share}% ($${row.value.toLocaleString()})`, 240, y);
    y += 16;
  });

  y += 14;
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#18181B').text('3. Spice Product Catalog & Stock Status', 40, y);
  y += 20;

  summary.products.forEach((p) => {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#18181B')
      .text(
        `${p.sku} — ${p.name} (${p.category}): ${p.stockQty} kg in stock | Unit Price: $${p.unitPrice} | Status: ${p.badge}`,
        50,
        y
      );
    y += 16;
  });

  doc.end();
}
