const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

function buildExcel(configs) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Configurations');
  const now = new Date().toLocaleString();

  sheet.mergeCells('A1:P1');
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
    { header: 'Equipamento', key: 'equipment', width: 20 },
    { header: 'IP', key: 'ip', width: 16 },
    { header: 'Mascara', key: 'mask', width: 16 },
    { header: 'Gateway', key: 'gateway', width: 16 },
    { header: 'VLAN', key: 'vlan', width: 10 },
    { header: 'Servico', key: 'service', width: 20 },
    { header: 'MAC', key: 'mac', width: 20 },
    { header: 'Usuario Eq.', key: 'username', width: 16 },
    { header: 'Senha Eq.', key: 'password', width: 16 },
    { header: 'Configurado por', key: 'configured_by_name', width: 18 },
    { header: 'Validado por', key: 'validated_by_name', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
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
    const row = sheet.addRow(config);
    const statusCell = row.getCell('status');
    const normalized = String(statusCell.value || '').toUpperCase();
    if (normalized === 'APPROVED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD7F5E7' } };
    } else if (normalized === 'REJECTED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE1E7' } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D8' } };
    }
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

  doc.fontSize(16).text('Equipment Configuration Report', { underline: true });
  doc.moveDown();

  for (const [index, config] of configs.entries()) {
    const detailsUrl = `${webBaseUrl}/configs/${config.id}`;
    const qrBuffer = await QRCode.toBuffer(detailsUrl, { width: 82, margin: 1 });

    doc
      .fontSize(10)
      .text(
        `${index + 1}. [${config.status}] ${config.equipment} | IP: ${config.ip} | VLAN: ${config.vlan}`
      )
      .text(`Configured by: ${config.configured_by_name} | Validated by: ${config.validated_by_name || '-'}`)
      .text(`Service: ${config.service} | MAC: ${config.mac}`)
      .text(`Notes: ${config.notes || '-'}`)
      .text(
        `Created: ${new Date(config.created_at).toLocaleString()} | Validated: ${
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
