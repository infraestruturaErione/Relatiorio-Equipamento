const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function formatFilters(filters) {
  return Object.entries(filters || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'Sem filtros';
}

function buildExcel(configs, meta = {}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Configurations');
  const now = new Date().toLocaleString();
  const filtersText = formatFilters(meta.filters);

  sheet.mergeCells('A1:O1');
  sheet.getCell('A1').value = `Relatorio Executivo de Configuracoes - ${now}`;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3046' },
  };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 24;

  sheet.mergeCells('A2:O2');
  sheet.getCell('A2').value = `Total de registros: ${meta.total_records || configs.length}`;
  sheet.getCell('A2').font = { bold: true, size: 11 };

  sheet.mergeCells('A3:O3');
  sheet.getCell('A3').value = `Filtros aplicados: ${filtersText}`;
  sheet.getCell('A3').font = { italic: true, size: 10 };

  sheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Cliente', key: 'client_name', width: 20 },
    { header: 'Projeto', key: 'project_name', width: 20 },
    { header: 'Mascara', key: 'mask', width: 16 },
    { header: 'Gateway', key: 'gateway', width: 16 },
    { header: 'VLAN', key: 'vlan', width: 10 },
    { header: 'Servico', key: 'service', width: 20 },
    { header: 'MAC', key: 'mac', width: 20 },
    { header: 'Usuario Eq.', key: 'username', width: 16 },
    { header: 'Senha Eq.', key: 'password', width: 16 },
    { header: 'Configurado por', key: 'configured_by_name', width: 18 },
    { header: 'Validado por', key: 'validated_by_name', width: 18 },
    { header: 'Observacoes', key: 'notes', width: 30 },
    { header: 'Criado em', key: 'created_at', width: 20 },
    { header: 'Validado em', key: 'validated_at', width: 20 },
  ];

  const headerRow = sheet.getRow(4);
  headerRow.values = sheet.columns.map((column) => column.header);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D405A' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 22;

  configs.forEach((config) => {
    sheet.addRow(config);
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 4 && rowNumber % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = cell.fill || {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FBFF' },
        };
      });
    }
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: sheet.columns.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: 4 }];

  return workbook;
}

async function buildPdf(configs, writableStream, meta = {}) {
  const doc = new PDFDocument({ margin: 32, size: 'A4' });
  doc.pipe(writableStream);
  const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';
  const filtersText = formatFilters(meta.filters);

  doc
    .fontSize(18)
    .text('Relatorio Executivo de Configuracoes', { underline: true })
    .moveDown(0.5);
  doc.fontSize(10).fillColor('#334155')
    .text(`Gerado em: ${new Date(meta.generated_at || Date.now()).toLocaleString()}`)
    .text(`Total de registros: ${meta.total_records || configs.length}`)
    .text(`Filtros aplicados: ${filtersText}`)
    .moveDown(1.2);
  doc.fillColor('#000000');

  for (const [index, config] of configs.entries()) {
    const detailsUrl = `${webBaseUrl}/configs/${config.id}`;
    const qrBuffer = await QRCode.toBuffer(detailsUrl, { width: 82, margin: 1 });

    doc
      .roundedRect(32, doc.y - 2, doc.page.width - 64, 108, 8)
      .stroke('#CBD5E1');

    doc
      .fontSize(11)
      .text(
        `${index + 1}. ${config.client_name || '-'} / ${config.project_name || '-'}`
      )
      .moveDown(0.2)
      .text(`Mascara: ${config.mask || '-'} | Gateway: ${config.gateway || '-'} | VLAN: ${config.vlan}`)
      .text(`Configurado por: ${config.configured_by_name} | Validado por: ${config.validated_by_name || '-'}`)
      .text(`Service: ${config.service} | MAC: ${config.mac}`)
      .text(`Observacoes: ${config.notes || '-'}`)
      .text(
        `Criado em: ${new Date(config.created_at).toLocaleString()} | Validado em: ${
          config.validated_at ? new Date(config.validated_at).toLocaleString() : '-'
        }`
      )
      .text(`Detalhes: ${detailsUrl}`)
      .moveDown(0.8);

    doc.image(qrBuffer, doc.page.width - 120, doc.y - 74, { width: 72, height: 72 });
    doc.moveDown(3.2);

    if (doc.y > 700) {
      doc.addPage();
    }
  }

  doc.end();
}

module.exports = { buildExcel, buildPdf };
