const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const billsUploadDir = path.join(__dirname, '..', 'uploads', 'bills');

const ensureBillsUploadDir = () => {
  if (!fs.existsSync(billsUploadDir)) {
    fs.mkdirSync(billsUploadDir, { recursive: true });
  }
};

const toCurrency = (value) => {
  const amount = Number(value) || 0;
  return `Rs. ${amount.toFixed(2)}`;
};

const normalizeItems = (items = [], billAmount = 0) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      {
        name: 'Bill Amount',
        quantity: 1,
        price: Number(billAmount) || 0,
        amount: Number(billAmount) || 0,
      },
    ];
  }

  return items.map((item, index) => {
    const quantity = Number(item?.quantity) || 1;
    const price = Number(item?.price) || 0;
    const explicitAmount = Number(item?.amount);
    const amount = Number.isFinite(explicitAmount) ? explicitAmount : quantity * price;

    return {
      name: String(item?.name || `Item ${index + 1}`).trim() || `Item ${index + 1}`,
      quantity,
      price,
      amount,
    };
  });
};

const getBaseUrl = () => {
  const configuredBaseUrl = String(
    process.env.BASE_URL || process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || '',
  )
    .trim()
    .replace(/\/+$/, '');

  if (configuredBaseUrl) return configuredBaseUrl;

  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
};

const buildBillPdfUrl = (fileName) => `${getBaseUrl()}/uploads/bills/${fileName}`;

const drawDivider = (doc, y) => {
  doc
    .moveTo(50, y)
    .lineTo(545, y)
    .strokeColor('#d1d5db')
    .stroke();
};

const writeItemsTable = (doc, items, startY) => {
  let y = startY;

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#111827')
    .text('Item', 50, y)
    .text('Qty', 280, y, { width: 50, align: 'right' })
    .text('Price', 345, y, { width: 80, align: 'right' })
    .text('Amount', 440, y, { width: 100, align: 'right' });

  y += 18;
  drawDivider(doc, y);
  y += 12;

  items.forEach((item) => {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1f2937')
      .text(item.name, 50, y, { width: 210 })
      .text(String(item.quantity), 280, y, { width: 50, align: 'right' })
      .text(toCurrency(item.price), 345, y, { width: 80, align: 'right' })
      .text(toCurrency(item.amount), 440, y, { width: 100, align: 'right' });

    y += 22;
  });

  return y;
};

const generateBillPdf = async (bill) =>
  new Promise((resolve, reject) => {
    try {
      ensureBillsUploadDir();

      const fileName = `bill-${bill._id}.pdf`;
      const filePath = path.join(billsUploadDir, fileName);
      const pdfUrl = buildBillPdfUrl(fileName);
      const items = normalizeItems(bill.items, bill.billAmount);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc
        .font('Helvetica-Bold')
        .fontSize(22)
        .fillColor('#111827')
        .text('NTJ Billing Invoice', 50, 50);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#4b5563')
        .text(`Bill ID: ${bill._id}`, 50, 86)
        .text(`Created At: ${new Date(bill.createdAt || Date.now()).toLocaleString('en-IN')}`, 50, 102);

      drawDivider(doc, 128);

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#111827')
        .text('Customer Details', 50, 145);

      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#1f2937')
        .text(`Customer Name: ${bill.customerName}`, 50, 170)
        .text(`Phone Number: ${bill.phoneNumber}`, 50, 188);

      const tableEndY = writeItemsTable(doc, items, 235);

      drawDivider(doc, tableEndY + 4);

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#111827')
        .text(`Total: ${toCurrency(bill.billAmount)}`, 360, tableEndY + 18, {
          width: 180,
          align: 'right',
        });

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#4b5563')
        .text('This invoice was generated automatically by the billing system.', 50, 730, {
          width: 495,
          align: 'center',
        });

      doc.end();

      stream.on('finish', () => resolve({ fileName, filePath, pdfUrl }));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });

module.exports = {
  generateBillPdf,
  buildBillPdfUrl,
  ensureBillsUploadDir,
};
