const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function buildExcel(configs) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Configurations');
  const now = new Date().toLocaleString();

  sheet.mergeCells('A1:O1');
  sheet.getCell('A1').value = `Relatorio de Configuracoes - ${now}`;
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F3046' },
  };
  sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(1).height = 24;

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

  const headerRow = sheet.getRow(2);
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
    if (rowNumber > 2 && rowNumber % 2 === 1) {
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
    from: { row: 2, column: 1 },
    to: { row: 2, column: sheet.columns.length },
  };
  sheet.views = [{ state: 'frozen', ySplit: 2 }];

  return workbook;
}

async function buildPdf(configs, writableStream) {
  const doc = new PDFDocument({ margin: 32, size: 'A4' });
  doc.pipe(writableStream);
  const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:5173';

  doc.fontSize(16).text('Relatorio de Configuracoes de Equipamentos', { underline: true });
  doc.moveDown();

  for (const [index, config] of configs.entries()) {
    const detailsUrl = `${webBaseUrl}/configs/${config.id}`;
    const qrBuffer = await QRCode.toBuffer(detailsUrl, { width: 82, margin: 1 });

    doc
      .fontSize(10)
      .text(
        `${index + 1}. ${config.client_name || '-'} / ${config.project_name || '-'}`
      )
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
    doc.moveDown(3.8);

    if (doc.y > 730) {
      doc.addPage();
    }
  }

  doc.end();
}

module.exports = { buildExcel, buildPdf };
